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
 *
 *   node scripts/fix-weightlog-timezone.mjs --before 2026-08-28           # preview
 *   node scripts/fix-weightlog-timezone.mjs --before 2026-08-28 --apply   # write
 *
 * --before takes the deploy date of the fix, as a Pacific calendar day. Rows
 * dated on or after it were written correctly and are left alone. Preview
 * first and check that the reported "after" times look like plausible working
 * hours.
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

  const skipped = [];
  const changes = [];
  for (const log of logs) {
    const stored = new Date(log.date);
    if (alreadyCorrected.has(log.id)) {
      skipped.push(log);
      continue;
    }
    // The broken write stored Pacific wall time as if it were UTC. Undo that by
    // subtracting the (negative) offset, i.e. pushing the instant later.
    const corrected = new Date(stored.getTime() - pacificOffsetMs(stored));
    changes.push({ log, stored, corrected });
  }

  console.log(
    `Scanned ${logs.length} weight log(s) dated before ${beforeArg} (Pacific);`
    + ` ${skipped.length} already corrected by a previous --apply run.\n`,
  );

  if (changes.length === 0) {
    console.log('Nothing left to correct.');
    return;
  }

  let implausible = 0;
  for (const { log, stored, corrected } of changes) {
    const rolled = toPacificDateString(stored) !== toPacificDateString(corrected);
    const hour = Number(toPacificDateTimeLocal(corrected).slice(11, 13));
    const nightly = hour < 5;
    if (nightly) implausible += 1;
    console.log(
      `  #${String(log.id).padEnd(5)} ${(log.kitten?.name ?? 'unknown').padEnd(18)}`
      + ` ${formatPacificDisplay(stored, { withTime: true }).padEnd(24)}`
      + ` -> ${formatPacificDisplay(corrected, { withTime: true })}`
      + (rolled ? '   [date rolls forward a day]' : '')
      + (nightly ? '   [WARNING: after-time is between midnight and 5am]' : ''),
    );
  }

  const rolledCount = changes.filter(
    ({ stored, corrected }) => toPacificDateString(stored) !== toPacificDateString(corrected),
  ).length;
  console.log(`\n${rolledCount} row(s) currently show the wrong calendar day.`);
  if (implausible > 0) {
    console.log(
      `${implausible} row(s) land in the small hours after correction. That is the`
      + ' signature of a row that was already correct -- check them before applying.',
    );
  }

  if (!apply) {
    console.log(`\n${changes.length} row(s) would be updated.`);
    console.log('DRY RUN. Re-run with --apply to write these corrections.');
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
