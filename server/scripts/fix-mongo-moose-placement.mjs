/**
 * CR-51 data fix: Mongo and Moose should be actively placed with Simone Kimble.
 * Reopens/creates the correct placement history without wiping past fosters.
 *
 * Usage: node scripts/fix-mongo-moose-placement.mjs
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const CAT_NAMES = ['Mongo', 'Moose'];
const RECEIVING_FOSTER = 'Simone Kimble';

async function fixCat(name, receivingFoster) {
  const kitten = await prisma.kitten.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (!kitten) {
    console.log(`SKIP ${name}: not found`);
    return;
  }

  const placements = await prisma.placement.findMany({
    where: { kittenId: kitten.id },
    include: { foster: { select: { id: true, name: true } } },
    orderBy: { intakeDate: 'asc' },
  });

  console.log(`\n${name} (id=${kitten.id}) currentFosterId=${kitten.currentFosterId}`);
  for (const p of placements) {
    console.log(
      `  placement ${p.id} foster=${p.foster.name} start=${p.intakeDate?.toISOString?.()} end=${p.dischargeDate?.toISOString?.() || 'OPEN'} type=${p.dischargeType || ''}`,
    );
  }

  // Close any open placements that are NOT with Simone.
  await prisma.placement.updateMany({
    where: {
      kittenId: kitten.id,
      dischargeDate: null,
      fosterId: { not: receivingFoster.id },
    },
    data: {
      dischargeDate: new Date(),
      dischargeType: 'Transferred',
    },
  });

  // Find Simone placement(s).
  let simonePlacement = await prisma.placement.findFirst({
    where: { kittenId: kitten.id, fosterId: receivingFoster.id },
    orderBy: { intakeDate: 'desc' },
  });

  if (simonePlacement) {
    // Reactivate: clear discharge so it is the open placement.
    simonePlacement = await prisma.placement.update({
      where: { id: simonePlacement.id },
      data: { dischargeDate: null, dischargeType: null },
    });
    console.log(`  Reactivated Simone placement ${simonePlacement.id}`);
  } else {
    simonePlacement = await prisma.placement.create({
      data: {
        kittenId: kitten.id,
        fosterId: receivingFoster.id,
        intakeDate: new Date(),
        notes: 'CR-51 repair: reopened active placement with Simone Kimble',
      },
    });
    console.log(`  Created Simone placement ${simonePlacement.id}`);
  }

  // Ensure only one open placement remains (Simone's).
  await prisma.placement.updateMany({
    where: {
      kittenId: kitten.id,
      dischargeDate: null,
      id: { not: simonePlacement.id },
    },
    data: {
      dischargeDate: new Date(),
      dischargeType: 'Transferred',
    },
  });

  await prisma.kitten.update({
    where: { id: kitten.id },
    data: {
      currentFosterId: receivingFoster.id,
      status: 'In Foster Care',
    },
  });

  console.log(`  OK ${name} → active with ${receivingFoster.name}`);
}

async function main() {
  const receivingFoster = await prisma.foster.findFirst({
    where: { name: { equals: RECEIVING_FOSTER, mode: 'insensitive' } },
  });
  if (!receivingFoster) {
    console.error(`Foster not found: ${RECEIVING_FOSTER}`);
    process.exit(1);
  }

  for (const name of CAT_NAMES) {
    await fixCat(name, receivingFoster);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
