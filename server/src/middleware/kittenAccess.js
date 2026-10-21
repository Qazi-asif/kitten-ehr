import prisma from '../lib/prisma.js';
import { kittenOwnerWhere, mergeKittenWhere, scopesToOwnCats } from '../utils/kittenScope.js';

function parseKittenId(req) {
  const raw = req.params.id || req.params.kittenId;
  return Number.parseInt(raw, 10);
}

export async function requireAccessibleKitten(req, res, next) {
  try {
    if (!scopesToOwnCats(req)) return next();

    const id = parseKittenId(req);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid kitten id' });
    }

    const kitten = await prisma.kitten.findFirst({
      where: mergeKittenWhere({ id }, kittenOwnerWhere(req)),
      select: { id: true },
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
