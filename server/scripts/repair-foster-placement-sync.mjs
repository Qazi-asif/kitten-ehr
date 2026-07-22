// Repairs drift between Kitten.currentFosterId and open (dischargeDate:
// null) Placement rows. Three independent passes, run in this order so
// later passes see the effects of earlier ones:
//
//   1. Terminal-status kittens (Adopted/Transferred/Deceased/Released)
//      that still have an open placement - the placement is discharged
//      and currentFosterId is cleared, matching what updateKitten already
//      does for a fresh status change.
//   2. Kittens with a currentFosterId but no open placement left (either
//      pre-existing drift, or a side effect of step 1) - the orphaned
//      currentFosterId is cleared, per the preferred fix in the plan.
//   3. Open placements whose fosterId disagrees with the kitten's
//      currentFosterId - currentFosterId is corrected to the placement's
//      fosterId when exactly one open placement exists for that kitten.
//      Kittens with more than one open placement are left untouched and
//      reported, since which one is authoritative is not decidable here.
//
// Usage:
//   node server/scripts/repair-foster-placement-sync.mjs [--dry-run]
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const DRY_RUN = process.argv.includes('--dry-run');

const TERMINAL_KITTEN_STATUSES = ['Adopted', 'Transferred', 'Deceased', 'Released'];
const TERMINAL_DISCHARGE_TYPE = {
  Adopted: 'Adopted',
  Transferred: 'Transferred',
  Deceased: 'Deceased',
  Released: 'Released',
};

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function repairTerminalKittensWithOpenPlacements() {
  logSection('Step 1: Terminal-status kittens with an open placement');

  const kittens = await prisma.kitten.findMany({
    where: {
      status: { in: TERMINAL_KITTEN_STATUSES },
      placements: { some: { dischargeDate: null } },
    },
    select: {
      id: true,
      name: true,
      status: true,
      currentFosterId: true,
      placements: {
        where: { dischargeDate: null },
        select: { id: true, fosterId: true },
      },
    },
  });

  if (kittens.length === 0) {
    console.log('Nothing to fix.');
    return { fixed: 0 };
  }

  for (const kitten of kittens) {
    const dischargeType = TERMINAL_DISCHARGE_TYPE[kitten.status] || kitten.status;
    console.log(
      `Kitten #${kitten.id} (${kitten.name}) is ${kitten.status} but has ${kitten.placements.length} open placement(s): `
      + `${kitten.placements.map((p) => `#${p.id}`).join(', ')}. Will discharge as "${dischargeType}" and clear currentFosterId.`,
    );

    if (DRY_RUN) continue;

    await prisma.$transaction(async (tx) => {
      await tx.placement.updateMany({
        where: { kittenId: kitten.id, dischargeDate: null },
        data: { dischargeDate: new Date(), dischargeType },
      });
      await tx.kitten.update({
        where: { id: kitten.id },
        data: { currentFosterId: null },
      });
    });
  }

  return { fixed: kittens.length };
}

async function repairOrphanedCurrentFosterId() {
  logSection('Step 2: Kittens with currentFosterId but no open placement');

  const kittens = await prisma.kitten.findMany({
    where: {
      currentFosterId: { not: null },
      placements: { none: { dischargeDate: null } },
    },
    select: { id: true, name: true, currentFosterId: true },
  });

  if (kittens.length === 0) {
    console.log('Nothing to fix.');
    return { fixed: 0 };
  }

  for (const kitten of kittens) {
    console.log(
      `Kitten #${kitten.id} (${kitten.name}) has currentFosterId=${kitten.currentFosterId} but no open placement. Will clear currentFosterId.`,
    );

    if (DRY_RUN) continue;

    await prisma.kitten.update({
      where: { id: kitten.id },
      data: { currentFosterId: null },
    });
  }

  return { fixed: kittens.length };
}

async function repairMismatchedCurrentFosterId() {
  logSection('Step 3: Open placements whose fosterId disagrees with currentFosterId');

  const openPlacements = await prisma.placement.findMany({
    where: { dischargeDate: null },
    select: { id: true, kittenId: true, fosterId: true },
  });

  const placementsByKittenId = new Map();
  for (const placement of openPlacements) {
    const list = placementsByKittenId.get(placement.kittenId) || [];
    list.push(placement);
    placementsByKittenId.set(placement.kittenId, list);
  }

  const kittenIds = [...placementsByKittenId.keys()];
  if (kittenIds.length === 0) {
    console.log('No open placements found.');
    return { fixed: 0, skipped: 0 };
  }

  const kittens = await prisma.kitten.findMany({
    where: { id: { in: kittenIds } },
    select: { id: true, name: true, currentFosterId: true },
  });

  let fixed = 0;
  let skipped = 0;

  for (const kitten of kittens) {
    const openForKitten = placementsByKittenId.get(kitten.id) || [];
    const mismatched = openForKitten.some((p) => p.fosterId !== kitten.currentFosterId);
    if (!mismatched) continue;

    if (openForKitten.length > 1) {
      console.log(
        `Kitten #${kitten.id} (${kitten.name}) has ${openForKitten.length} open placements `
        + `(fosterIds: ${openForKitten.map((p) => p.fosterId).join(', ')}) and currentFosterId=${kitten.currentFosterId}. `
        + 'Multiple open placements - skipping, needs manual review.',
      );
      skipped += 1;
      continue;
    }

    const [placement] = openForKitten;
    console.log(
      `Kitten #${kitten.id} (${kitten.name}) has currentFosterId=${kitten.currentFosterId} but its open placement `
      + `#${placement.id} belongs to foster #${placement.fosterId}. Will set currentFosterId=${placement.fosterId}.`,
    );

    if (!DRY_RUN) {
      await prisma.kitten.update({
        where: { id: kitten.id },
        data: { currentFosterId: placement.fosterId },
      });
    }
    fixed += 1;
  }

  if (fixed === 0 && skipped === 0) {
    console.log('Nothing to fix.');
  }

  return { fixed, skipped };
}

async function main() {
  console.log(`Foster/placement sync repair - ${DRY_RUN ? 'DRY RUN (no writes will be made)' : 'LIVE RUN'}`);

  const step1 = await repairTerminalKittensWithOpenPlacements();
  const step2 = await repairOrphanedCurrentFosterId();
  const step3 = await repairMismatchedCurrentFosterId();

  logSection('Summary');
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    terminalKittensDischarged: step1.fixed,
    orphanedCurrentFosterIdCleared: step2.fixed,
    currentFosterIdCorrected: step3.fixed,
    mismatchedSkippedForManualReview: step3.skipped,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Repair script failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
