/**
 * Pure logic for the startup schema-drift check. Deliberately imports nothing —
 * no prisma, no fs — so the test suite can exercise it without opening a
 * connection to the shared production database.
 *
 * "Drift" here means only one direction: an object the running Prisma client
 * expects that the database does not have. That is the direction that breaks
 * queries (P2022). Extra columns in the database are ignored, because a
 * database that is ahead of the schema does not fail any query.
 */

const ENUM_BLOCK = /\benum\s+([A-Za-z_]\w*)\s*\{([^}]*)\}/g;
const BARE_IDENTIFIER = /^[A-Za-z_]\w*$/;

/**
 * Pulls enum names and their variants out of schema.prisma text.
 *
 * The generated client is built with engineType = "client", whose runtime DMMF
 * omits enums entirely, so the schema file is the only source for them. Any
 * variant line this simple parser does not recognise (an @map, a multi-token
 * line) is skipped rather than guessed at — under-reporting is safe here,
 * inventing an expected variant is not.
 */
export function parseEnumsFromSchema(schemaText) {
  const enums = new Map();
  if (typeof schemaText !== 'string' || !schemaText) return enums;

  ENUM_BLOCK.lastIndex = 0;
  let match = ENUM_BLOCK.exec(schemaText);
  while (match) {
    const [, name, body] = match;
    const variants = new Set();
    for (const rawLine of body.split('\n')) {
      const line = rawLine.replace(/\/\/.*$/, '').trim();
      if (line && BARE_IDENTIFIER.test(line)) variants.add(line);
    }
    if (variants.size) enums.set(name, variants);
    match = ENUM_BLOCK.exec(schemaText);
  }

  return enums;
}

/**
 * Turns the client's DMMF datamodel into the table/column shape it will query.
 *
 * DMMF is the right source of truth rather than schema.prisma: it describes the
 * client that is actually running, which is what will throw P2022. Relation
 * ("object") fields are not columns; enum-typed fields are.
 */
export function expectedTablesFromDatamodel(datamodel) {
  const tables = new Map();
  const models = datamodel?.models;
  if (!Array.isArray(models)) return tables;

  for (const model of models) {
    if (!model?.name || !Array.isArray(model.fields)) continue;
    const tableName = model.dbName || model.name;
    const columns = new Set();
    for (const field of model.fields) {
      if (!field?.name) continue;
      if (field.kind !== 'scalar' && field.kind !== 'enum') continue;
      columns.add(field.dbName || field.name);
    }
    if (columns.size) tables.set(tableName, columns);
  }

  return tables;
}

/**
 * Compares what the client expects against what the database reports.
 *
 * @param expectedTables Map<table, Set<column>> from expectedTablesFromDatamodel
 * @param expectedEnums  Map<enum, Set<variant>> from parseEnumsFromSchema
 * @param actualTables   Map<table, Set<column>> read from information_schema
 * @param actualEnums    Map<enum, Set<variant>> read from pg_enum
 * @returns array of { kind, name } sorted for stable output
 */
export function findMissingObjects({
  expectedTables,
  expectedEnums,
  actualTables,
  actualEnums,
}) {
  const missing = [];

  for (const [table, columns] of expectedTables ?? []) {
    const actualColumns = actualTables?.get(table);
    if (!actualColumns) {
      missing.push({ kind: 'table', name: table });
      continue;
    }
    for (const column of columns) {
      if (!actualColumns.has(column)) {
        missing.push({ kind: 'column', name: `${table}.${column}` });
      }
    }
  }

  for (const [enumName, variants] of expectedEnums ?? []) {
    const actualVariants = actualEnums?.get(enumName);
    // An enum with no rows in pg_enum is either absent or unused by any model.
    // Reporting the type as missing is accurate either way.
    if (!actualVariants) {
      missing.push({ kind: 'enum', name: enumName });
      continue;
    }
    for (const variant of variants) {
      if (!actualVariants.has(variant)) {
        missing.push({ kind: 'enum value', name: `${enumName}.${variant}` });
      }
    }
  }

  missing.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  return missing;
}

const MAX_LISTED = 40;

/**
 * Renders the warning as an array of lines. Contains only object names taken
 * from the schema — never a connection string or any environment value.
 */
export function formatDriftReport(missing) {
  if (!Array.isArray(missing) || missing.length === 0) return [];

  const rule = '='.repeat(72);
  const lines = [
    rule,
    `SCHEMA DRIFT: the database is missing ${missing.length} object(s) that this`,
    'build of the Prisma client expects. Queries touching them will fail.',
    '',
  ];

  for (const item of missing.slice(0, MAX_LISTED)) {
    lines.push(`  missing ${item.kind.padEnd(11)} ${item.name}`);
  }
  if (missing.length > MAX_LISTED) {
    lines.push(`  ...and ${missing.length - MAX_LISTED} more`);
  }

  lines.push(
    '',
    'FIX: against the production DATABASE_URL, run',
    '       npx prisma db push && npx prisma generate',
    '     then restart the app. See hostinger-operations.md.',
    rule,
  );

  return lines;
}

/**
 * On in production, off in development unless explicitly switched on.
 *
 * Drift is the normal, expected state while iterating locally — you edit
 * schema.prisma before you push it. A warning that fires on every dev boot is a
 * warning everyone learns to scroll past, which is the exact habit that let
 * this reach production three times. Set SCHEMA_DRIFT_CHECK=true to force it on
 * anywhere; SCHEMA_DRIFT_CHECK=false disables it in production.
 */
export function isDriftCheckEnabled(env = {}) {
  const raw = String(env.SCHEMA_DRIFT_CHECK ?? '').trim().toLowerCase();
  if (['false', '0', 'off', 'no'].includes(raw)) return false;
  if (['true', '1', 'on', 'yes'].includes(raw)) return true;
  return env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test';
}

/**
 * Strips anything that could carry credentials or a host out of a diagnostic
 * string. Applied to every error message this module logs, because driver and
 * CLI errors sometimes embed the datasource URL.
 */
export function scrubSecrets(text) {
  if (typeof text !== 'string' || !text) return '';
  return text
    .replace(/[a-zA-Z][\w+.-]*:\/\/\S*/g, '[redacted-url]')
    .replace(/\b(password|pgpassword|user|host|dbname)\s*=\s*\S+/gi, '$1=[redacted]')
    .slice(0, 300);
}
