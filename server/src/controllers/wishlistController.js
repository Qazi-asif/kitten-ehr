import prisma from '../lib/prisma.js';

const OWNER_TYPES = new Set(['ORG', 'FOSTER', 'KITTEN']);
const RETAILERS = new Set(['AMAZON', 'CHEWY', 'WALMART']);

const DEFAULT_LABELS = {
  AMAZON: 'Amazon Wishlist',
  CHEWY: 'Chewy Wishlist',
  WALMART: 'Walmart Wishlist',
};

function normalizeUrl(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function hasPermission(req, permission) {
  return (req.permissions || []).includes(permission);
}

function canManageOwner(req, ownerType) {
  if (ownerType === 'ORG') return hasPermission(req, 'settings.manage');
  return hasPermission(req, 'kittens.edit');
}

async function validateOwner(ownerType, ownerId) {
  if (ownerType === 'ORG') {
    const settings = await prisma.settings.findUnique({ where: { id: ownerId } });
    if (!settings) return 'Organization settings not found';
    return null;
  }

  if (ownerType === 'KITTEN') {
    const kitten = await prisma.kitten.findUnique({ where: { id: ownerId } });
    if (!kitten) return 'Kitten not found';
    return null;
  }

  if (ownerType === 'FOSTER') {
    const foster = await prisma.foster.findUnique({ where: { id: ownerId } });
    if (!foster) return 'Foster not found';
    return null;
  }

  return 'Invalid owner type';
}

export async function getWishlists(req, res, next) {
  try {
    const ownerType = typeof req.query.ownerType === 'string' ? req.query.ownerType.trim().toUpperCase() : '';
    const ownerId = Number.parseInt(req.query.ownerId, 10);

    if (!OWNER_TYPES.has(ownerType) || !Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ error: 'ownerType and ownerId are required' });
    }

    const ownerError = await validateOwner(ownerType, ownerId);
    if (ownerError) return res.status(404).json({ error: ownerError });

    const wishlists = await prisma.wishlist.findMany({
      where: { ownerType, ownerId },
      orderBy: [{ retailer: 'asc' }, { updatedAt: 'desc' }],
    });

    res.json(wishlists);
  } catch (error) {
    next(error);
  }
}

export async function createWishlist(req, res, next) {
  try {
    const ownerType = typeof req.body.ownerType === 'string' ? req.body.ownerType.trim().toUpperCase() : '';
    const ownerId = Number.parseInt(req.body.ownerId, 10);
    const retailer = typeof req.body.retailer === 'string' ? req.body.retailer.trim().toUpperCase() : '';
    const url = normalizeUrl(req.body.url);
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';

    if (!OWNER_TYPES.has(ownerType) || !Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ error: 'ownerType and ownerId are required' });
    }

    if (!RETAILERS.has(retailer)) {
      return res.status(400).json({ error: 'retailer must be AMAZON, CHEWY, or WALMART' });
    }

    if (!url) {
      return res.status(400).json({ error: 'A valid url is required' });
    }

    if (!canManageOwner(req, ownerType)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const ownerError = await validateOwner(ownerType, ownerId);
    if (ownerError) return res.status(404).json({ error: ownerError });

    const wishlist = await prisma.wishlist.upsert({
      where: {
        ownerType_ownerId_retailer: { ownerType, ownerId, retailer },
      },
      update: {
        url,
        label: label || DEFAULT_LABELS[retailer],
      },
      create: {
        ownerType,
        ownerId,
        retailer,
        url,
        label: label || DEFAULT_LABELS[retailer],
      },
    });

    res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
}

export async function deleteWishlist(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid wishlist id' });
    }

    const existing = await prisma.wishlist.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Wishlist not found' });

    if (!canManageOwner(req, existing.ownerType)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.wishlist.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Wishlist not found' });
    next(error);
  }
}

export async function getPublicWishlists(req, res, next) {
  try {
    const ownerType = typeof req.query.ownerType === 'string' ? req.query.ownerType.trim().toUpperCase() : '';
    const ownerId = Number.parseInt(req.query.ownerId, 10);

    if (!OWNER_TYPES.has(ownerType) || !Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ error: 'ownerType and ownerId are required' });
    }

    const ownerError = await validateOwner(ownerType, ownerId);
    if (ownerError) return res.status(404).json({ error: ownerError });

    const wishlists = await prisma.wishlist.findMany({
      where: { ownerType, ownerId },
      orderBy: [{ retailer: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        retailer: true,
        url: true,
        label: true,
        updatedAt: true,
      },
    });

    res.json(wishlists);
  } catch (error) {
    next(error);
  }
}
