import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const today = new Date();
today.setHours(12, 0, 0, 0);

const inserts = [
  { kittenId: 25, fosterId: 9, intakeDate: today, dischargeDate: null, dischargeType: null, notes: '' },
  { kittenId: 27, fosterId: 9, intakeDate: today, dischargeDate: null, dischargeType: null, notes: '' },
];

console.log('=== Inserting placements ===\n');
console.log(JSON.stringify(inserts.map((row) => ({
  ...row,
  intakeDate: row.intakeDate.toISOString(),
})), null, 2));

const created = [];
for (const data of inserts) {
  const row = await prisma.placement.create({ data });
  created.push(row);
  console.log(`\nCreated placement id=${row.id} kittenId=${row.kittenId} fosterId=${row.fosterId}`);
}

console.log('\n=== Foster 9 count verification ===\n');

const foster = await prisma.foster.findUnique({
  where: { id: 9 },
  select: {
    id: true,
    name: true,
    maxKittens: true,
    _count: { select: { currentKittens: true } },
    currentKittens: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
  },
});

const openPlacementCount = await prisma.placement.count({
  where: { fosterId: 9, dischargeDate: null },
});

const openPlacements = await prisma.placement.findMany({
  where: { fosterId: 9, dischargeDate: null },
  select: { id: true, kittenId: true, kitten: { select: { name: true } } },
  orderBy: { kittenId: 'asc' },
});

console.log(JSON.stringify({
  fosterId: foster.id,
  name: foster.name,
  maxKittens: foster.maxKittens,
  listPageCapacity_currentKittensCount: `${foster._count.currentKittens}/${foster.maxKittens}`,
  detailPageCapacity_openPlacements: `${openPlacementCount}/${foster.maxKittens}`,
  countsMatch: foster._count.currentKittens === openPlacementCount,
  currentKittens: foster.currentKittens,
  openPlacements,
  createdPlacementIds: created.map((r) => r.id),
}, null, 2));

await prisma.$disconnect();
