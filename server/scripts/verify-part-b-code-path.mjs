import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const FOSTER_ID = 9;

const [fkCount, openPlacementCount, openPlacements] = await Promise.all([
  prisma.kitten.count({ where: { currentFosterId: FOSTER_ID } }),
  prisma.placement.count({ where: { fosterId: FOSTER_ID, dischargeDate: null } }),
  prisma.placement.findMany({
    where: { fosterId: FOSTER_ID, dischargeDate: null },
    select: { id: true, kittenId: true },
    orderBy: { kittenId: 'asc' },
  }),
]);

// Mirrors getAllFosters() after Part B — open placements, NOT FK count
const openPlacementCounts = await prisma.placement.groupBy({
  by: ['fosterId'],
  where: { dischargeDate: null, fosterId: FOSTER_ID },
  _count: { _all: true },
});
const listPageCountNewCodePath = openPlacementCounts[0]?._count._all ?? 0;

// Mirrors FosterDetailPage.jsx — placements.filter(!dischargeDate).length
const detailPageCount = openPlacements.length;

const foster = await prisma.foster.findUnique({
  where: { id: FOSTER_ID },
  select: { name: true, maxKittens: true },
});

console.log(JSON.stringify({
  foster: foster.name,
  maxKittens: foster.maxKittens,
  oldCodePath_fkCurrentKittensCount: fkCount,
  newCodePath_openPlacementCount: listPageCountNewCodePath,
  detailPage_openPlacementCount: detailPageCount,
  listAndDetailMatch: listPageCountNewCodePath === detailPageCount,
  displayedCapacity: `${listPageCountNewCodePath}/${foster.maxKittens}`,
  proofNewPathDiffersFromFk: fkCount === listPageCountNewCodePath
    ? 'counts agree today but list now uses placement groupBy, not _count.currentKittens'
    : `FK would show ${fkCount}/25, placement path shows ${listPageCountNewCodePath}/25`,
  openPlacementIds: openPlacements.map((p) => p.id),
}, null, 2));

await prisma.$disconnect();
