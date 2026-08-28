/**
 * Runs the test suite once per host timezone.
 *
 * The Pacific date bug survived four rounds of fixes partly because it was
 * verified on machines whose timezone hid it. A suite that only runs in one
 * timezone cannot catch this class of bug, so CI should run this script.
 */
import { spawnSync } from 'node:child_process';

const TIMEZONES = [
  'UTC', // production (Vercel)
  'America/Los_Angeles', // the org's timezone
  'Asia/Karachi', // UTC+5, fails opposite to production
  'Australia/Sydney', // far east of Pacific
  'America/New_York', // same country, different offset
];

let failed = 0;

for (const TZ of TIMEZONES) {
  const result = spawnSync(
    process.execPath,
    ['--test', 'tests/*.test.js'],
    { env: { ...process.env, TZ }, stdio: 'pipe', encoding: 'utf8', shell: false },
  );

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const pass = output.match(/pass (\d+)/)?.[1] ?? '?';
  const fail = output.match(/fail (\d+)/)?.[1] ?? '?';
  const ok = result.status === 0;

  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  TZ=${TZ.padEnd(22)} ${pass} passed, ${fail} failed`);
  if (!ok) console.log(output);
}

if (failed > 0) {
  console.error(`\n${failed} timezone(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${TIMEZONES.length} timezones passed.`);
