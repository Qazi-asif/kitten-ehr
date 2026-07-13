import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const reference = await prisma.placement.findUnique({
  where: { id: 18 },
  select: {
    id: true,
    kittenId: true,
    fosterId: true,
    intakeDate: true,
    dischargeDate: true,
    dischargeType: true,
    notes: true,
  },
});

console.log('=== Reference: Placement id 18 (tommy) ===\n');
console.log(JSON.stringify(reference, null, 2));

const kittens = await prisma.kitten.findMany({
  where: { id: { in: [25, 27] } },
  select: { id: true, name: true, currentFosterId: true },
  orderBy: { id: 'asc' },
});

console.log('\n=== Kittens to backfill ===\n');
console.log(JSON.stringify(kittens, null, 2));

const today = new Date();
today.setHours(12, 0, 0, 0);

const proposed = [
  {
    kittenId: 25,
    fosterId: 9,
    intakeDate: today.toISOString(),
    dischargeDate: null,
    dischargeType: null,
    notes: '',
  },
  {
    kittenId: 27,
    fosterId: 9,
    intakeDate: today.toISOString(),
    dischargeDate: null,
    dischargeType: null,
    notes: '',
  },
];

console.log('\n=== Proposed inserts (same shape as id 18) ===\n');
console.log(JSON.stringify(proposed, null, 2));

await prisma.$disconnect();
