/**
 * Read-only validation that every defined report runs and returns a well-formed
 * result. Performs reads only — writes nothing.
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { REPORTS, resolveDateRange } from '../src/services/reports.js';

async function main() {
  const range = resolveDateRange({ startDate: '2000-01-01' });

  for (const report of REPORTS) {
    try {
      const result = await report.run(prisma, range, { vaccineType: '' });
      const badRow = result.rows.find((row) => row.length !== result.columns.length);
      if (badRow) {
        console.log(`  FAIL  ${report.label}: row width ${badRow.length} != ${result.columns.length} columns`);
        process.exitCode = 1;
        continue;
      }
      console.log(
        `  OK    ${report.label.padEnd(38)} ${String(result.rows.length).padStart(4)} rows, `
        + `${result.summary.length} summary stats`,
      );
      for (const stat of result.summary.slice(0, 4)) {
        console.log(`           ${stat.label}: ${stat.value}`);
      }
    } catch (error) {
      console.log(`  FAIL  ${report.label}: ${error.message.split('\n').slice(0, 3).join(' ')}`);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
