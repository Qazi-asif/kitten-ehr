/**
 * Read-only validation that every reminder category's Prisma filter is valid
 * and returns sane numbers. Performs counts only — writes nothing.
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { REMINDER_CATEGORIES } from '../src/services/reminderCategories.js';

async function main() {
  const totalCats = await prisma.kitten.count();
  console.log(`Total cats in database: ${totalCats}\n`);

  for (const category of REMINDER_CATEGORIES) {
    try {
      const count = await prisma.kitten.count({ where: category.buildWhere() });
      console.log(`  OK    ${category.label.padEnd(24)} ${count}`);
    } catch (error) {
      console.log(`  FAIL  ${category.label.padEnd(24)} ${error.message.split('\n')[0]}`);
      process.exitCode = 1;
    }
  }

  // Deworming keys off protocol drug names, so show what names actually exist
  // and whether any doses are outstanding — a zero count should be real, not a
  // silent matching failure.
  const drugs = await prisma.protocolDrug.findMany({
    select: { drugName: true, recordType: true },
    distinct: ['drugName'],
    orderBy: { drugName: 'asc' },
  });
  console.log(`\nProtocol drug names on file (${drugs.length}):`);
  for (const drug of drugs) console.log(`   - ${drug.drugName}  [${drug.recordType}]`);

  const scheduled = await prisma.protocolDose.count({ where: { status: 'SCHEDULED' } });
  console.log(`\nScheduled protocol doses overall: ${scheduled}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
