import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const IDS = [28, 30, 32, 34];

console.log('=== Step 1: ContractHouseholdAcknowledgment rows for contracts 28/30/32/34 ===\n');

const acknowledgments = await prisma.contractHouseholdAcknowledgment.findMany({
  where: { contractId: { in: IDS } },
  orderBy: [{ contractId: 'asc' }, { id: 'asc' }],
  select: {
    id: true,
    contractId: true,
    name: true,
    signatureImageUrl: true,
    signedAt: true,
    createdAt: true,
  },
});

console.log(`Related acknowledgment rows: ${acknowledgments.length}`);
console.log(JSON.stringify(acknowledgments, null, 2));

if (acknowledgments.length > 0) {
  console.log('\nNote: ContractHouseholdAcknowledgment.contract uses onDelete: Cascade — child rows will be removed with the contract.');
}

console.log('\n=== Step 2: Delete contracts 28, 30, 32, 34 ===\n');

const deleteResult = await prisma.contract.deleteMany({
  where: { id: { in: IDS } },
});

console.log(`deleteMany rows affected: ${deleteResult.count}`);

console.log('\n=== Step 3: Re-query those four IDs ===\n');

const remaining = await prisma.contract.findMany({
  where: { id: { in: IDS } },
  orderBy: { id: 'asc' },
  select: { id: true, signerName: true, signerEmail: true },
});

console.log(`Remaining rows: ${remaining.length}`);
console.log(JSON.stringify(remaining, null, 2));

const remainingAcks = await prisma.contractHouseholdAcknowledgment.findMany({
  where: { contractId: { in: IDS } },
  select: { id: true, contractId: true },
});

console.log(`\nRemaining acknowledgment rows for those contract IDs: ${remainingAcks.length}`);
console.log(JSON.stringify(remainingAcks, null, 2));

await prisma.$disconnect();
