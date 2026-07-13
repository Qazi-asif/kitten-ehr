import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const KITTEN_IDS = [25, 27];

const kittens = await prisma.kitten.findMany({
  where: { id: { in: KITTEN_IDS } },
  select: {
    id: true,
    name: true,
    status: true,
    currentFosterId: true,
    currentFoster: { select: { id: true, name: true } },
    createdAt: true,
  },
  orderBy: { id: 'asc' },
});

console.log('=== Kitten current state ===\n');
console.log(JSON.stringify(kittens, null, 2));

const placements = await prisma.placement.findMany({
  where: { kittenId: { in: KITTEN_IDS } },
  orderBy: [{ kittenId: 'asc' }, { id: 'asc' }],
  select: {
    id: true,
    kittenId: true,
    fosterId: true,
    foster: { select: { id: true, name: true } },
    intakeDate: true,
    dischargeDate: true,
    dischargeType: true,
    notes: true,
  },
});

console.log('\n=== Full placement history (kittenId 25 and 27) ===\n');
console.log(`Total placement rows found: ${placements.length}\n`);
console.log(JSON.stringify(placements, null, 2));

for (const kittenId of KITTEN_IDS) {
  const kitten = kittens.find((k) => k.id === kittenId);
  const rows = placements.filter((p) => p.kittenId === kittenId);
  console.log(`\n--- Summary kitten ${kittenId} (${kitten?.name ?? '?'}) ---`);
  console.log(`currentFosterId: ${kitten?.currentFosterId ?? null} (${kitten?.currentFoster?.name ?? 'none'})`);
  console.log(`placement row count: ${rows.length}`);
  if (rows.length === 0) {
    console.log('verdict: ZERO placement history — currentFosterId was set outside the placement system');
  } else {
    const open = rows.filter((p) => !p.dischargeDate);
    const discharged = rows.filter((p) => p.dischargeDate);
    console.log(`open placements: ${open.length}`);
    console.log(`discharged placements: ${discharged.length}`);
    if (open.length === 0 && kitten?.currentFosterId) {
      console.log('verdict: had placement(s) but all discharged — currentFosterId is STALE after legitimate discharge');
    } else if (open.length > 0) {
      console.log('verdict: has open placement(s)');
    }
  }
}

await prisma.$disconnect();
