import prisma from '../lib/prisma.js';
import { PENDING_OR_ADOPTED } from '../services/rescueGroupsCsv.js';
import { buildPublicAvailableKittenWhereClause } from '../utils/publishTargets.js';

const UNAVAILABLE = new Set([
  ...PENDING_OR_ADOPTED,
  'Transferred',
  'Deceased',
  'Released',
  'Medical Hold',
]);

export async function getApplyStatus(req, res, next) {
  try {
    const raw = req.query.cat || req.query.externalId || req.params.id;
    const asId = Number.parseInt(raw, 10);
    const kitten = await prisma.kitten.findFirst({
      where: Number.isInteger(asId)
        ? { id: asId }
        : { OR: [{ externalId: String(raw || '') }, { name: String(raw || '') }] },
      select: {
        id: true,
        name: true,
        status: true,
        isListedOnWebsite: true,
        isActive: true,
        breed: true,
        color: true,
        sex: true,
        externalId: true,
      },
    });

    if (!kitten) {
      return res.json({ available: false, reason: 'not_found', similar: [] });
    }

    const unavailable = UNAVAILABLE.has(kitten.status) || kitten.isActive === false;
    if (!unavailable) {
      return res.json({ available: true, kitten });
    }

    const similar = await prisma.kitten.findMany({
      where: {
        ...buildPublicAvailableKittenWhereClause(),
        id: { not: kitten.id },
      },
      take: 6,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        breed: true,
        color: true,
        primaryPhotoUrl: true,
        externalId: true,
      },
    });

    res.json({
      available: false,
      reason: 'found_a_home',
      message: 'This cat has found a home, here are similar cats',
      kitten: { id: kitten.id, name: kitten.name, status: kitten.status, externalId: kitten.externalId },
      similar,
    });
  } catch (error) {
    next(error);
  }
}
