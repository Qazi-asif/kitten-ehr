/**
 * Startup guard against Prisma schema drift — a schema change committed and
 * deployed without `prisma db push` having been run against production. That
 * has taken this site down three times (missing Wishlist.groupName /
 * sortOrder, missing Kitten.coatPattern, and the social-post scheduler's
 * attemptCount / PUBLISHING silently failing).
 *
 * It WARNS and never does anything else. It cannot crash the process, cannot
 * delay boot, and writes no secrets. A false positive here must be strictly
 * less harmful than the drift it looks for.
 *
 * Mechanism: two read-only catalogue queries on the connection the app already
 * has, compared against the running client's DMMF. The documented alternative,
 * `prisma migrate diff --from-schema-datasource --to-schema-datamodel
 * --exit-code`, produces the same answer but costs ~9s of CPU and a second
 * heavyweight Node process per boot. Passenger boots this app on demand under a
 * plan resource ceiling that has already caused outages, so paying that on
 * every cold start to run a diagnostic was the wrong trade.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prisma from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/index.js';
import {
  expectedTablesFromDatamodel,
  findMissingObjects,
  formatDriftReport,
  isDriftCheckEnabled,
  parseEnumsFromSchema,
  scrubSecrets,
} from './schemaDriftPolicy.js';

const SCHEMA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../prisma/schema.prisma',
);

const TIMEOUT_MS = 8_000;

function debug(message) {
  if (process.env.SCHEMA_DRIFT_CHECK_DEBUG) {
    console.log(`[schema-drift] ${scrubSecrets(message)}`);
  }
}

async function readActualTables() {
  // Read-only: information_schema is a set of system views. The ::text casts
  // are required — these columns are sql_identifier/name, which the Prisma raw
  // deserializer refuses to decode.
  const rows = await prisma.$queryRaw`
    SELECT table_name::text AS table_name, column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
  `;

  const tables = new Map();
  for (const row of rows) {
    const table = row.table_name;
    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table).add(row.column_name);
  }
  return tables;
}

async function readActualEnums() {
  const rows = await prisma.$queryRaw`
    SELECT t.typname::text AS enum_name, e.enumlabel::text AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = current_schema()
  `;

  const enums = new Map();
  for (const row of rows) {
    const name = row.enum_name;
    if (!enums.has(name)) enums.set(name, new Set());
    enums.get(name).add(row.enum_value);
  }
  return enums;
}

async function readExpectedEnums() {
  try {
    return parseEnumsFromSchema(await readFile(SCHEMA_PATH, 'utf8'));
  } catch (err) {
    // schema.prisma is not guaranteed to be deployed. Column checks still work.
    debug(`enum check skipped: ${err?.message || err}`);
    return new Map();
  }
}

/**
 * Runs the comparison. Resolves with { checked, missing } and never rejects.
 * Exported so it can be run by hand: `node -e "..."` or a future health route.
 */
export async function checkSchemaDrift() {
  try {
    const expectedTables = expectedTablesFromDatamodel(Prisma?.dmmf?.datamodel);
    if (expectedTables.size === 0) {
      debug('no models in DMMF; nothing to compare');
      return { checked: false, missing: [] };
    }

    const [expectedEnums, actualTables, actualEnums] = await Promise.all([
      readExpectedEnums(),
      readActualTables(),
      readActualEnums(),
    ]);

    const missing = findMissingObjects({
      expectedTables,
      expectedEnums,
      actualTables,
      actualEnums,
    });

    return { checked: true, missing };
  } catch (err) {
    debug(`check failed: ${err?.code || err?.name || 'error'}: ${err?.message || err}`);
    return { checked: false, missing: [] };
  }
}

/**
 * Fire-and-forget. Returns synchronously; the caller is never awaited on and
 * nothing here can reject. Call it after the server is already listening.
 */
export function startSchemaDriftCheck() {
  if (!isDriftCheckEnabled(process.env)) {
    debug('disabled by env');
    return;
  }

  const timeout = new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ checked: false, missing: [] }), TIMEOUT_MS);
    // Do not hold the event loop open on a short-lived process.
    timer.unref?.();
  });

  Promise.race([checkSchemaDrift(), timeout])
    .then(({ checked, missing }) => {
      if (!checked || missing.length === 0) return;
      for (const line of formatDriftReport(missing)) {
        console.warn(`[schema-drift] ${line}`);
      }
    })
    .catch((err) => {
      debug(`reporting failed: ${err?.message || err}`);
    });
}
