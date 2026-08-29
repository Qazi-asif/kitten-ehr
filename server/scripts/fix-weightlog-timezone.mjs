/**
 * CR-103 data remediation: correct WeightLog.date rows written through the
 * broken parser.
 *
 * !!  DANGER  !!
 * With --apply this UPDATES WeightLog.date in place, adding 7 hours (PDT) or
 * 8 hours (PST) to every row it selects. There is NO undo. Take a database
 * snapshot before running with --apply. Shifting an already-correct row pushes
 * it 7-8 hours LATE, which is just as wrong as the bug being repaired.
 *
 * Before the fix, `createWeightLog` routed the form's `datetime-local` value
 * through `parsePacificDateOnly`. That parser's regex rejected the time-bearing
 * string and fell back to `new Date(raw)`, which resolved it against the server
 * timezone (UTC in production). A 2:30 PM Pacific entry was therefore stored as
 * 14:30Z instead of 21:30Z -- 7 hours early under PDT, 8 under PST.
 *
 * Safety design:
 *   - --before is MANDATORY. WeightLog has no createdAt column, so the only
 *     available scope guard is the `date` value itself; the script refuses to
 *     run rather than scanning every row.
 *   - Every applied correction is journalled to scripts/.fix-weightlog-timezone
 *     .applied.json. Rows listed there are skipped on later runs, so a second
 *     --apply cannot double-shift them even if the same --before is reused.
 *   - DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *   - Rows whose corrected time would land between midnight and 5am Pacific are
 *     HELD BACK by default. That is the signature of a row that was already
 *     written correctly (a plausible evening weigh-in becomes an implausible
 *     small-hours one). Pass --allow-overnight to shift them anyway.
 *   - Rows with an implausible stored year (before 2000, or after next year) are
 *     ALWAYS held back. They are corrupt in a way this script cannot repair and
 *     need a human decision.
 *   - --exclude-ids takes a comma-separated list of WeightLog ids to hold back
 *     by hand. A value that is not a list of positive integers aborts the run;
 *     bad input never widens scope.
 *
 * --before takes the deploy date of the fix, as a Pacific calendar day. Rows
 * dated on or after it were written correctly and are left alone. Preview
 * first and check that the reported "after" times look like plausible working
 * hours.
 *
 * Flags:
 *   --before YYYY-MM-DD   (required) Pacific day the fix deployed.
 *   --exclude-ids a,b,c   Hold back these WeightLog ids.
 *   --allow-overnight     Permit corrections landing 00:00-04:59 Pacific.
 *   --apply               Write the corrections. Without it, dry run.
 *
 * RECOMMENDED INVOCATION FOR THE CR-103 REPAIR (run the dry run first, read it,
 * then run the apply). The excluded ids are the 5 rows that already display as
 * sensible evening Pacific times plus row 111, whose stored year is 0001:
 *
 *   node scripts/fix-weightlog-timezone.mjs --before 2026-08-28 --exclude-ids 52,54,90,91,104,111
 *   node scripts/fix-weightlog-timezone.mjs --before 2026-08-28 --exclude-ids 52,54,90,91,104,111 --apply
 *
 * Expected: 113 candidates, 6 excluded, 107 updated.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import {
  formatPacificDisplay,
  parsePacificDateOnly,
  toPacificDateString,
  toPacificDateTimeLocal,
} from '../src/utils/pacificDate.js';

const JOURNAL_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '.fix-weightlog-timezone.applied.json',
);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const beforeIndex = args.indexOf('--before');
const beforeArg = beforeIndex === -1 ? '' : (args[beforeIndex + 1] || '');
const allowOvernight = args.includes('--allow-overnight');
const excludeIndex = args.indexOf('--exclude-ids');
const excludeArg = excludeIndex === -1 ? null : (args[excludeIndex + 1] ?? '');

const MIN_PLAUSIBLE_YEAR = 2000;
const MAX_PLAUSIBLE_YEAR = new Date().getUTCFullYear() + 1;

/**
 * Parse --exclude-ids. Returns { ids } or { error }; a malformed value must abort
 * the run rather than fall back to an empty set, which would widen scope.
 */
function parseExcludeIds(raw) {
  if (raw === null) return { ids: new Set() };
  const trimmed = String(raw).trim();
  if (trimmed === '' || trimmed.startsWith('--')) {
    return { error: '--exclude-ids requires a comma-separated list of ids, e.g. --exclude-ids 52,54' };
  }
  const ids = new Set();
  for (const part of trimmed.split(',')) {
    const token = part.trim();
    if (!/^\d+$/.test(token) || Number(token) === 0) {
      return { error: `--exclude-ids contains a value that is not a positive integer: "${token}"` };
    }
    ids.add(Number(token));
  }
  return { ids };
}

/** Pacific's UTC offset in ms at a given instant (-7h PDT, -8h PST). */
function pacificOffsetMs(instant) {
  const minuteAligned = Math.floor(Number(instant) / 60000) * 60000;
  const wall = toPacificDateTimeLocal(new Date(minuteAligned));
  return Date.parse(`${wall}:00Z`) - minuteAligned;
}

function readJournal() {
  if (!existsSync(JOURNAL_PATH)) return { entries: [] };
  const parsed = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8'));
  return Array.isArray(parsed?.entries) ? parsed : { entries: [] };
}

function writeJournal(journal) {
  writeFileSync(JOURNAL_PATH, `${JSON.stringify(journal, null, 2)}\n`, 'utf8');
}

async function main() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeArg)) {
    console.error(
      'Refusing to run: --before YYYY-MM-DD is required.\n'
      + 'Pass the Pacific calendar day the CR-103 fix was deployed. Rows dated on\n'
      + 'or after that day were written correctly and must not be shifted.',
    );
    process.exitCode = 1;
    return;
  }

  const before = parsePacificDateOnly(beforeArg);
  if (!before) {
    console.error(`Refusing to run: could not parse --before ${beforeArg} as a Pacific day.`);
    process.exitCode = 1;
    return;
  }

  const excludeResult = parseExcludeIds(excludeArg);
  if (excludeResult.error) {
    console.error(`Refusing to run: ${excludeResult.error}`);
    process.exitCode = 1;
    return;
  }
  const excludeIds = excludeResult.ids;

  const journal = readJournal();
  const alreadyCorrected = new Map(journal.entries.map((e) => [e.id, e]));

  const logs = await prisma.weightLog.findMany({
    where: { date: { lt: before } },
    orderBy: { date: 'asc' },
    include: { kitten: { select: { id: true, name: true } } },
  });

  if (logs.length === 0) {
    console.log(`No weight logs dated before ${beforeArg} (Pacific).`);
    return;
  }

  const journalled = [];
  const heldManual = [];
  const heldCorrupt = [];
  const heldOvernight = [];
  const changes = [];
  for (const log of logs) {
    const stored = new Date(log.date);
    if (alreadyCorrected.has(log.id)) {
      journalled.push({ log, stored });
      continue;
    }
    if (excludeIds.has(log.id)) {
      heldManual.push({ log, stored });
      continue;
    }
    const storedYear = stored.getUTCFullYear();
    if (
      Number.isNaN(stored.getTime())
      || storedYear < MIN_PLAUSIBLE_YEAR
      || storedYear > MAX_PLAUSIBLE_YEAR
    ) {
      heldCorrupt.push({ log, stored, storedYear });
      continue;
    }
    // The broken write stored Pacific wall time as if it were UTC. Undo that by
    // subtracting the (negative) offset, i.e. pushing the instant later.
    const corrected = new Date(stored.getTime() - pacificOffsetMs(stored));
    const hour = Number(toPacificDateTimeLocal(corrected).slice(11, 13));
    if (hour < 5 && !allowOvernight) {
      heldOvernight.push({ log, stored, corrected });
      continue;
    }
    changes.push({ log, stored, corrected, overnight: hour < 5 });
  }

  const label = (log) => `  #${String(log.id).padEnd(5)} ${(log.kitten?.name ?? 'unknown').padEnd(18)}`;
  const excluded = heldManual.length + heldCorrupt.length + heldOvernight.length;

  console.log(
    `Found ${logs.length} candidate weight log(s) dated before ${beforeArg} (Pacific).\n`,
  );

  if (heldManual.length > 0) {
    console.log(`EXCLUDED BY --exclude-ids (${heldManual.length}) -- held back, not modified:`);
    for (const { log, stored } of heldManual) {
      console.log(`${label(log)} currently displays ${formatPacificDisplay(stored, { withTime: true })}`);
    }
    console.log('');
  }
  const requestedButAbsent = [...excludeIds].filter(
    (id) => !heldManual.some(({ log }) => log.id === id),
  );
  if (requestedButAbsent.length > 0) {
    console.log(
      `NOTE: --exclude-ids listed ${requestedButAbsent.join(', ')}, which are not in the`
      + ' candidate set (out of --before range, or already journalled).\n',
    );
  }

  if (heldCorrupt.length > 0) {
    console.log(`CORRUPT, NEEDS MANUAL REVIEW (${heldCorrupt.length}) -- always held back:`);
    for (const { log, stored, storedYear } of heldCorrupt) {
      const iso = Number.isNaN(stored.getTime()) ? 'invalid date' : stored.toISOString();
      console.log(`${label(log)} stored year ${storedYear} (${iso})`);
    }
    console.log(
      'These dates are implausible and cannot be repaired by a timezone shift.\n'
      + 'Decide the true date with a human and fix them by hand.\n',
    );
  }

  if (heldOvernight.length > 0) {
    console.log(
      `HELD BACK BY OVERNIGHT SAFETY NET (${heldOvernight.length}) -- correcting these would`
      + ' land between midnight and 5am Pacific, the signature of an already-correct row:',
    );
    for (const { log, stored, corrected } of heldOvernight) {
      console.log(
        `${label(log)} ${formatPacificDisplay(stored, { withTime: true }).padEnd(24)}`
        + ` -> would become ${formatPacificDisplay(corrected, { withTime: true })}`,
      );
    }
    console.log('Pass --allow-overnight only if these really were overnight weigh-ins.\n');
  }

  if (changes.length > 0) {
    console.log(`${apply ? 'TO APPLY' : 'WOULD UPDATE'} (${changes.length}):`);
    for (const { log, stored, corrected, overnight } of changes) {
      const rolled = toPacificDateString(stored) !== toPacificDateString(corrected);
      console.log(
        `${label(log)} ${formatPacificDisplay(stored, { withTime: true }).padEnd(24)}`
        + ` -> ${formatPacificDisplay(corrected, { withTime: true })}`
        + (rolled ? '   [date rolls forward a day]' : '')
        + (overnight ? '   [WARNING: --allow-overnight forced a midnight-5am result]' : ''),
      );
    }
    const rolledCount = changes.filter(
      ({ stored, corrected }) => toPacificDateString(stored) !== toPacificDateString(corrected),
    ).length;
    console.log(`\n${rolledCount} of those currently show the wrong calendar day.`);
  }

  console.log('\nReconciliation:');
  console.log(`  candidates found          ${logs.length}`);
  console.log(`  excluded (total)          ${excluded}`);
  console.log(`    - by --exclude-ids      ${heldManual.length}`);
  console.log(`    - corrupt year          ${heldCorrupt.length}`);
  console.log(`    - overnight safety net  ${heldOvernight.length}`);
  console.log(`  already journalled        ${journalled.length}`);
  console.log(`  ${apply ? 'to update                ' : 'would update             '} ${changes.length}`);
  console.log(`  = ${excluded} + ${journalled.length} + ${changes.length} = ${excluded + journalled.length + changes.length} of ${logs.length}`);

  if (changes.length === 0) {
    console.log('\nNothing left to correct.');
    return;
  }

  if (!apply) {
    console.log('\nDRY RUN. Re-run with --apply to write these corrections.');
    return;
  }

  console.log('\nApplying...');
  let updated = 0;
  for (const { log, stored, corrected } of changes) {
    await prisma.weightLog.update({ where: { id: log.id }, data: { date: corrected } });
    journal.entries.push({
      id: log.id,
      from: stored.toISOString(),
      to: corrected.toISOString(),
      appliedAt: new Date().toISOString(),
    });
    // Journal after each row so an interrupted run cannot lose its record of
    // what was already shifted.
    writeJournal(journal);
    updated += 1;
  }
  console.log(`Updated ${updated} weight log(s). Journal: ${JOURNAL_PATH}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
