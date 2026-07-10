import prisma from '../lib/prisma.js';
import { DEFAULTS } from './settingsController.js';
import { PUBLIC_SETTINGS_SELECT, toPublicSettings } from '../utils/publicSettings.js';
import {
  buildPublicAvailableKittenWhereClause,
  buildPublicWebsiteWhereClause,
} from '../utils/publishTargets.js';
import { isPhotoDocument, photoDocumentOrderBy } from '../utils/photoDocuments.js';
import {
  GENERIC_KITTEN_PHOTO_FALLBACK,
  isResolvablePhotoUrl,
  normalizeKittenPhotoUrl,
} from '../utils/resolveKittenPhotoUrl.js';

const publicKittenSelect = {
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
  isBondedPair: true,
  bondedWithKittenId: true,
  bondedWithName: true,
  isMedicalSpecialNeeds: true,
  bondedWithKitten: { select: { id: true, name: true } },
};

const publicWebsiteFilter = buildPublicWebsiteWhereClause();
const publicAvailableKittenFilter = buildPublicAvailableKittenWhereClause();

async function enrichPublicKittensWithPhotos(kittens) {
  if (kittens.length === 0) return kittens;

  const needsDocLookup = kittens.filter((kitten) => !isResolvablePhotoUrl(kitten.primaryPhotoUrl));
  if (needsDocLookup.length === 0) {
    return kittens.map((kitten) => {
      const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
      return normalized
        ? { ...kitten, primaryPhotoUrl: normalized }
        : { ...kitten, primaryPhotoUrl: normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK };
    });
  }

  const photoByKittenId = new Map();

  if (needsDocLookup.length > 0) {
    const documents = await prisma.document.findMany({
      where: { kittenId: { in: needsDocLookup.map((kitten) => kitten.id) } },
      orderBy: photoDocumentOrderBy(),
      select: { kittenId: true, fileUrl: true, docType: true, isPrimaryPhoto: true },
    });

    for (const document of documents) {
      if (photoByKittenId.size === needsDocLookup.length) break;
      if (!isPhotoDocument(document)) continue;
      if (!photoByKittenId.has(document.kittenId)) {
        photoByKittenId.set(document.kittenId, document.fileUrl);
      }
    }
  }

  return kittens.map((kitten) => {
    const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
    if (normalized) {
      return { ...kitten, primaryPhotoUrl: normalized };
    }

    const documentPhoto = photoByKittenId.get(kitten.id);
    if (documentPhoto) {
      return { ...kitten, primaryPhotoUrl: documentPhoto };
    }

    const nameFallback = normalizeKittenPhotoUrl(null, kitten.name);
    return { ...kitten, primaryPhotoUrl: nameFallback || GENERIC_KITTEN_PHOTO_FALLBACK };
  });
}

function resolvePublicKittenPhoto(kitten, documentPhoto = null) {
  const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
  if (normalized) return normalized;
  if (documentPhoto) return documentPhoto;
  return normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK;
}

export async function getPublicKittens(req, res, next) {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : undefined;

    const kittens = await prisma.kitten.findMany({
      where: publicAvailableKittenFilter,
      select: publicKittenSelect,
      orderBy: { id: 'asc' },
      ...(limit ? { take: limit } : {}),
    });
    res.json(await enrichPublicKittensWithPhotos(kittens));
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
      select: publicKittenSelect,
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const [enriched] = await enrichPublicKittensWithPhotos([kitten]);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
}

export async function getPublicStats(_req, res, next) {
  try {
    const [availableKittens, adoptedKittens, activeFosters] = await Promise.all([
      prisma.kitten.count({ where: publicAvailableKittenFilter }),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.foster.count({ where: { currentKittens: { some: {} } } }),
    ]);

    res.json({ availableKittens, adoptedKittens, activeFosters });
  } catch (error) {
    next(error);
  }
}

export async function getPublicContent(req, res, next) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const articles = await prisma.content.findMany({
      where: {
        ...publicWebsiteFilter,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, category: true, body: true, createdAt: true },
    });
    res.json(articles);
  } catch (error) {
    next(error);
  }
}

export async function getPublicContentBySlug(req, res, next) {
  try {
    const article = await prisma.content.findFirst({
      where: { slug: req.params.slug, ...publicWebsiteFilter },
      select: { id: true, title: true, slug: true, body: true, category: true, createdAt: true },
    });

    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    next(error);
  }
}

export async function getPublicEvents(_req, res, next) {
  try {
    const events = await prisma.event.findMany({
      where: {
        ...publicWebsiteFilter,
        isPublic: true,
        status: 'PUBLISHED',
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        location: true,
        description: true,
      },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenPhotos(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
      select: { id: true, primaryPhotoUrl: true },
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const documents = await prisma.document.findMany({
      where: { kittenId: id },
      orderBy: [{ isPrimaryPhoto: 'desc' }, { sortOrder: 'asc' }, { uploadedAt: 'desc' }],
      select: {
        id: true,
        fileUrl: true,
        docType: true,
        isPrimaryPhoto: true,
        uploadedAt: true,
      },
    });

    const photos = documents.filter(
      (doc) =>
        doc.isPrimaryPhoto ||
        doc.fileUrl.startsWith('data:image/') ||
        /Photo/i.test(doc.docType || '') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileUrl),
    );

    const gallery = [];
    const seen = new Set();
    const resolvedPrimary = resolvePublicKittenPhoto(kitten);

    if (resolvedPrimary) {
      gallery.push({
        id: 'primary',
        fileUrl: resolvedPrimary,
        isPrimaryPhoto: true,
      });
      seen.add(resolvedPrimary);
    }

    for (const photo of photos) {
      if (seen.has(photo.fileUrl)) continue;
      gallery.push(photo);
      seen.add(photo.fileUrl);
    }

    res.json(gallery);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenUpdates(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
      select: { id: true },
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const updates = await prisma.update.findMany({
      where: { kittenId: id, ...publicWebsiteFilter },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    res.json(updates);
  } catch (error) {
    next(error);
  }
}

export async function getPublicSettings(_req, res, next) {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 },
      select: PUBLIC_SETTINGS_SELECT,
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1, ...DEFAULTS },
        select: PUBLIC_SETTINGS_SELECT,
      });
    }

    res.set('Cache-Control', 'no-store');
    res.json(toPublicSettings(settings));
  } catch (error) {
    next(error);
  }
}
