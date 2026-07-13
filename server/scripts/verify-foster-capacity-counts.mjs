import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const FOSTER_ID = 9;

const [foster, openPlacementCounts] = await Promise.all([
  prisma.foster.findUnique({
    where: { id: FOSTER_ID },
    select: {
      id: true,
      name: true,
      maxKittens: true,
      _count: { select: { placements: true } },
    },
  }),
  prisma.placement.groupBy({
    by: ['fosterId'],
    where: { dischargeDate: null, fosterId: FOSTER_ID },
    _count: { _all: true },
  }),
]);

const listPageActiveCount = openPlacementCounts[0]?._count._all ?? 0;

const openPlacements = await prisma.placement.findMany({
  where: { fosterId: FOSTER_ID, dischargeDate: null },
  select: { id: true, kittenId: true, kitten: { select: { name: true } } },
  orderBy: { kittenId: 'asc' },
});

const detailPageActiveCount = openPlacements.length;

console.log(JSON.stringify({
  fosterId: foster.id,
  name: foster.name,
  maxKittens: foster.maxKittens,
  listPageCapacity: `${listPageActiveCount}/${foster.maxKittens}`,
  detailPageCapacity: `${detailPageActiveCount}/${foster.maxKittens}`,
  countsMatch: listPageActiveCount === detailPageActiveCount,
  openPlacements,
  backfillRows: openPlacements.filter((p) => [25, 27].includes(p.kittenId)),
}, null, 2));

await prisma.$disconnect();
