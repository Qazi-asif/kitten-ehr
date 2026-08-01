/**
 * DEPRECATED behavior fixed: this script previously CLEARED currentFosterId
 * for any kitten without an open placement, which broke foster display for
 * Adopted cats and for active cats whose placement was wrongly discharged.
 *
 * Prefer:
 *   node server/scripts/backfill-current-foster-from-placements.mjs [--dry-run]
 *
 * This wrapper forwards to the backfill script so old docs/commands stay safe.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, 'backfill-current-foster-from-placements.mjs');
const args = process.argv.slice(2);

console.log('Note: repair-foster-placement-sync.mjs now delegates to backfill-current-foster-from-placements.mjs');
console.log('(It no longer clears currentFosterId for closed placements.)\n');

const child = spawn(process.execPath, [target, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

child.on('exit', (code) => process.exit(code ?? 1));
