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

function parseOwnerId(value) {
  const ownerId = Number.parseInt(value, 10);
  if (!Number.isInteger(ownerId) || ownerId <= 0) return null;
  return ownerId;
}

function hasPermission(req, permission) {
  return (req.permissions || []).includes(permission);
}

function canManageOwner(req, ownerType) {
  if (ownerType === 'ORG') return hasPermission(req, 'settings.manage');
  if (ownerType === 'FOSTER') return hasPermission(req, 'fosters.manage');
  if (ownerType === 'KITTEN') return hasPermission(req, 'kittens.edit');
  return false;
}

async function validateOwner(ownerType, ownerId) {
  if (ownerType === 'ORG') {
    const settings = await prisma.settings.findUnique({ where: { id: ownerId } });
    if (!settings) return 'Organization settings not found';
    return null;
  }

  if (ownerType === 'KITTEN') {
    const kitten = await prisma.kitten.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        name: true,
        status: true,
        primaryPhotoUrl: true,
        rescueStory: true,
        dateOfBirth: true,
        sex: true,
        breed: true,
        color: true,
        specialNeeds: true,
      },
    });
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

async function listWishlists(ownerType, ownerId, { publicView = false } = {}) {
  const ownerError = await validateOwner(ownerType, ownerId);
  if (ownerError) {
    const error = new Error(ownerError);
    error.statusCode = 404;
    throw error;
  }

  return prisma.wishlist.findMany({
    where: { ownerType, ownerId },
    orderBy: [{ retailer: 'asc' }, { updatedAt: 'desc' }],
    select: publicView
      ? {
        id: true,
        retailer: true,
        url: true,
        label: true,
        updatedAt: true,
      }
      : undefined,
  });
}

async function upsertWishlist({ ownerType, ownerId, retailer, url, label }) {
  const ownerError = await validateOwner(ownerType, ownerId);
  if (ownerError) {
    const error = new Error(ownerError);
    error.statusCode = 404;
    throw error;
  }

  return prisma.wishlist.upsert({
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
}

export async function getWishlists(req, res, next) {
  try {
    const ownerType = typeof req.query.ownerType === 'string' ? req.query.ownerType.trim().toUpperCase() : '';
    const ownerId = parseOwnerId(req.query.ownerId);

    if (!OWNER_TYPES.has(ownerType) || !ownerId) {
      return res.status(400).json({ error: 'ownerType and ownerId are required' });
    }

    const wishlists = await listWishlists(ownerType, ownerId);
    res.json(wishlists);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function getFosterWishlists(req, res, next) {
  try {
    const ownerId = parseOwnerId(req.params.id);
    if (!ownerId) return res.status(400).json({ error: 'Invalid foster id' });

    const wishlists = await listWishlists('FOSTER', ownerId);
    res.json(wishlists);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function getKittenWishlists(req, res, next) {
  try {
    const ownerId = parseOwnerId(req.params.id);
    if (!ownerId) return res.status(400).json({ error: 'Invalid kitten id' });

    const wishlists = await listWishlists('KITTEN', ownerId);
    res.json(wishlists);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function createWishlist(req, res, next) {
  try {
    const ownerType = typeof req.body.ownerType === 'string' ? req.body.ownerType.trim().toUpperCase() : '';
    const ownerId = parseOwnerId(req.body.ownerId);
    const retailer = typeof req.body.retailer === 'string' ? req.body.retailer.trim().toUpperCase() : '';
    const url = normalizeUrl(req.body.url);
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';

    if (!OWNER_TYPES.has(ownerType) || !ownerId) {
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

    const wishlist = await upsertWishlist({ ownerType, ownerId, retailer, url, label });
    res.status(201).json(wishlist);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function createFosterWishlist(req, res, next) {
  try {
    const ownerId = parseOwnerId(req.params.id);
    const retailer = typeof req.body.retailer === 'string' ? req.body.retailer.trim().toUpperCase() : '';
    const url = normalizeUrl(req.body.url);
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';

    if (!ownerId) return res.status(400).json({ error: 'Invalid foster id' });
    if (!RETAILERS.has(retailer)) {
      return res.status(400).json({ error: 'retailer must be AMAZON, CHEWY, or WALMART' });
    }
    if (!url) return res.status(400).json({ error: 'A valid url is required' });
    if (!canManageOwner(req, 'FOSTER')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const wishlist = await upsertWishlist({
      ownerType: 'FOSTER',
      ownerId,
      retailer,
      url,
      label,
    });
    res.status(201).json(wishlist);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function createKittenWishlist(req, res, next) {
  try {
    const ownerId = parseOwnerId(req.params.id);
    const retailer = typeof req.body.retailer === 'string' ? req.body.retailer.trim().toUpperCase() : '';
    const url = normalizeUrl(req.body.url);
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';

    if (!ownerId) return res.status(400).json({ error: 'Invalid kitten id' });
    if (!RETAILERS.has(retailer)) {
      return res.status(400).json({ error: 'retailer must be AMAZON, CHEWY, or WALMART' });
    }
    if (!url) return res.status(400).json({ error: 'A valid url is required' });
    if (!canManageOwner(req, 'KITTEN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const wishlist = await upsertWishlist({
      ownerType: 'KITTEN',
      ownerId,
      retailer,
      url,
      label,
    });
    res.status(201).json(wishlist);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function deleteWishlist(req, res, next) {
  try {
    const id = parseOwnerId(req.params.id);
    if (!id) {
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
    const ownerId = parseOwnerId(req.query.ownerId);

    if (!OWNER_TYPES.has(ownerType) || !ownerId) {
      return res.status(400).json({ error: 'ownerType and ownerId are required' });
    }

    const wishlists = await listWishlists(ownerType, ownerId, { publicView: true });
    res.json(wishlists);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function getPublicFosterWishlists(req, res, next) {
  try {
    const ownerId = parseOwnerId(req.params.id);
    if (!ownerId) return res.status(400).json({ error: 'Invalid foster id' });

    const wishlists = await listWishlists('FOSTER', ownerId, { publicView: true });
    res.json(wishlists);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}

export async function getPublicKittenWishlists(req, res, next) {
  try {
    const ownerId = parseOwnerId(req.params.id);
    if (!ownerId) return res.status(400).json({ error: 'Invalid kitten id' });

    const wishlists = await listWishlists('KITTEN', ownerId, { publicView: true });
    res.json(wishlists);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: error.message });
    next(error);
  }
}
