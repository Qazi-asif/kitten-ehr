/**
 * One-time / idempotent foster visibility repair for Kitten-EHR.
 *
 * 1. Terminal-status kittens with open placements → close placements with
 *    dischargeDate + dischargeType matching status. KEEP currentFosterId.
 * 2. Kittens with currentFosterId null that have placements → set
 *    currentFosterId from open placement foster, else most recent placement
 *    (by intakeDate, then id).
 * 3. Open placements whose fosterId disagrees with currentFosterId → correct
 *    currentFosterId to the single open placement's foster.
 *
 * Does NOT clear currentFosterId for non-terminal cats (In Socialization,
 * Medical Hold, etc.) even when placements were discharged-as-Adopted.
 *
 * Usage:
 *   node server/scripts/backfill-current-foster-from-placements.mjs [--dry-run]
 */
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

function pickFosterIdFromPlacements(placements) {
  if (!placements?.length) return null;
  const open = placements.find((p) => p.dischargeDate == null);
  const chosen = open || placements[0];
  return chosen?.fosterId ?? null;
}

async function closeOpenPlacementsForTerminalKittens() {
  logSection('Step 1: Close open placements for terminal-status kittens (keep currentFosterId)');

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
    return { closed: 0, fosterRestored: 0 };
  }

  let fosterRestored = 0;

  for (const kitten of kittens) {
    const dischargeType = TERMINAL_DISCHARGE_TYPE[kitten.status] || kitten.status;
    const placementFosterId = kitten.placements[0]?.fosterId ?? null;
    const shouldRestoreFoster = kitten.currentFosterId == null && placementFosterId != null;

    console.log(
      `Kitten #${kitten.id} (${kitten.name}) is ${kitten.status} with ${kitten.placements.length} open placement(s). `
      + `Will discharge as "${dischargeType}"`
      + (shouldRestoreFoster ? ` and set currentFosterId=${placementFosterId}` : ' (keeping currentFosterId)'),
    );

    if (DRY_RUN) {
      if (shouldRestoreFoster) fosterRestored += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.placement.updateMany({
        where: { kittenId: kitten.id, dischargeDate: null },
        data: { dischargeDate: new Date(), dischargeType },
      });
      if (shouldRestoreFoster) {
        await tx.kitten.update({
          where: { id: kitten.id },
          data: { currentFosterId: placementFosterId },
        });
        fosterRestored += 1;
      }
    });
  }

  return { closed: kittens.length, fosterRestored };
}

async function backfillNullCurrentFosterId() {
  logSection('Step 2: Restore currentFosterId from latest placement when null');

  const kittens = await prisma.kitten.findMany({
    where: {
      currentFosterId: null,
      placements: { some: {} },
    },
    select: {
      id: true,
      name: true,
      status: true,
      placements: {
        orderBy: [{ intakeDate: 'desc' }, { id: 'desc' }],
        select: { id: true, fosterId: true, dischargeDate: true, dischargeType: true },
      },
    },
  });

  if (kittens.length === 0) {
    console.log('Nothing to fix.');
    return { restored: 0, mismatches: [] };
  }

  let restored = 0;
  const mismatches = [];

  for (const kitten of kittens) {
    const fosterId = pickFosterIdFromPlacements(kitten.placements);
    if (!fosterId) continue;

    const latest = kitten.placements.find((p) => p.dischargeDate == null) || kitten.placements[0];
    const isNonTerminal = !TERMINAL_KITTEN_STATUSES.includes(kitten.status);
    const weirdDischarge = isNonTerminal
      && latest?.dischargeDate
      && TERMINAL_KITTEN_STATUSES.includes(latest.dischargeType);

    if (weirdDischarge) {
      mismatches.push({
        id: kitten.id,
        name: kitten.name,
        status: kitten.status,
        dischargeType: latest.dischargeType,
        placementId: latest.id,
        restoringFosterId: fosterId,
      });
      console.log(
        `Kitten #${kitten.id} (${kitten.name}) status="${kitten.status}" but placement #${latest.id} `
        + `dischargeType="${latest.dischargeType}". Leaving status; restoring currentFosterId=${fosterId}.`,
      );
    } else {
      console.log(
        `Kitten #${kitten.id} (${kitten.name}) currentFosterId=null → set ${fosterId} from placement #${latest.id}.`,
      );
    }

    if (!DRY_RUN) {
      await prisma.kitten.update({
        where: { id: kitten.id },
        data: { currentFosterId: fosterId },
      });
    }
    restored += 1;
  }

  return { restored, mismatches };
}

async function repairMismatchedOpenPlacementFoster() {
  logSection('Step 3: Align currentFosterId with single open placement');

  const openPlacements = await prisma.placement.findMany({
    where: { dischargeDate: null },
    select: { id: true, kittenId: true, fosterId: true },
  });

  const byKitten = new Map();
  for (const placement of openPlacements) {
    const list = byKitten.get(placement.kittenId) || [];
    list.push(placement);
    byKitten.set(placement.kittenId, list);
  }

  const kittenIds = [...byKitten.keys()];
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
    const openForKitten = byKitten.get(kitten.id) || [];
    if (!openForKitten.some((p) => p.fosterId !== kitten.currentFosterId)) continue;

    if (openForKitten.length > 1) {
      console.log(
        `Kitten #${kitten.id} (${kitten.name}) has ${openForKitten.length} open placements — skip.`,
      );
      skipped += 1;
      continue;
    }

    const [placement] = openForKitten;
    console.log(
      `Kitten #${kitten.id} (${kitten.name}) currentFosterId=${kitten.currentFosterId} → ${placement.fosterId}.`,
    );

    if (!DRY_RUN) {
      await prisma.kitten.update({
        where: { id: kitten.id },
        data: { currentFosterId: placement.fosterId },
      });
    }
    fixed += 1;
  }

  if (fixed === 0 && skipped === 0) console.log('Nothing to fix.');
  return { fixed, skipped };
}

async function main() {
  console.log(`Backfill currentFoster from placements — ${DRY_RUN ? 'DRY RUN' : 'LIVE RUN'}`);

  const step1 = await closeOpenPlacementsForTerminalKittens();
  const step2 = await backfillNullCurrentFosterId();
  const step3 = await repairMismatchedOpenPlacementFoster();

  logSection('Summary');
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    terminalOpenPlacementsClosed: step1.closed,
    terminalFosterRestoredWhileClosing: step1.fosterRestored,
    currentFosterIdRestoredFromPlacements: step2.restored,
    statusVsDischargeMismatchesNoted: step2.mismatches,
    openPlacementFosterAligned: step3.fixed,
    multipleOpenPlacementsSkipped: step3.skipped,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
