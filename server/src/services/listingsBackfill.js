import prisma from '../lib/prisma.js';
import { formatExternalId } from '../utils/kittenScope.js';

export async function backfillListingFields() {
  const currentlyPublic = await prisma.kitten.findMany({
    where: {
      isListedOnWebsite: false,
      status: { in: ['Available for Adoption', 'In Foster Care'] },
      OR: [
        { publishTargets: { isEmpty: true } },
        { publishTargets: { has: 'WEBSITE' } },
      ],
    },
    select: { id: true },
  });

  if (currentlyPublic.length > 0) {
    await prisma.kitten.updateMany({
      where: { id: { in: currentlyPublic.map((kitten) => kitten.id) } },
      data: { isListedOnWebsite: true },
    });
  }

  const missingExternal = await prisma.kitten.findMany({
    where: { OR: [{ externalId: null }, { externalId: '' }] },
    select: { id: true },
  });

  for (const kitten of missingExternal) {
    await prisma.kitten.update({
      where: { id: kitten.id },
      data: { externalId: formatExternalId(kitten.id) },
    });
  }

  return {
    listedOnWebsite: currentlyPublic.length,
    externalIds: missingExternal.length,
  };
}
