/**
 * CR-104 backfill: tag vaccine protocol lines with recordType = VACCINE.
 *
 * `ProtocolDrug.recordType` defaults to NONE, and the Protocol Library form
 * leaves it there unless someone changes the dropdown. A dose on a NONE line
 * writes nothing to the vaccination log, which is why FVRCP doses were not
 * showing up.
 *
 * The controller now falls back to matching the drug name, so the app works
 * without this script. Running it makes the data explicit so the fallback stops
 * being load-bearing, and so the Protocol Library shows the right value.
 *
 * DRY RUN BY DEFAULT.
 *
 *   node scripts/backfill-protocol-record-types.mjs           # preview
 *   node scripts/backfill-protocol-record-types.mjs --apply   # write
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const VACCINE_NAME_PATTERN = /\b(fvrcp|frcp|hcp|rabies|felv|fiv|bordetella|distemper|panleuk|calici|rhinotrach)/i;

const apply = process.argv.includes('--apply');

async function main() {
  const candidates = await prisma.protocolDrug.findMany({
    where: { recordType: 'NONE' },
    include: { protocol: { select: { name: true } } },
  });

  const matches = candidates.filter((drug) => VACCINE_NAME_PATTERN.test(drug.drugName || ''));

  if (matches.length === 0) {
    console.log(`Scanned ${candidates.length} untagged protocol line(s); none look like vaccines.`);
    return;
  }

  console.log(`Found ${matches.length} untagged protocol line(s) that look like vaccines:\n`);
  for (const drug of matches) {
    console.log(`  #${String(drug.id).padEnd(5)} ${(drug.protocol?.name ?? 'unknown protocol').padEnd(32)} ${drug.drugName}`);
  }

  if (!apply) {
    console.log('\nDRY RUN. Re-run with --apply to set recordType = VACCINE on these lines.');
    return;
  }

  // Vaccines are recorded once per dose.
  const result = await prisma.protocolDrug.updateMany({
    where: { id: { in: matches.map((d) => d.id) } },
    data: { recordType: 'VACCINE', healthWriteMode: 'PER_DOSE' },
  });

  console.log(`\nUpdated ${result.count} protocol line(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
