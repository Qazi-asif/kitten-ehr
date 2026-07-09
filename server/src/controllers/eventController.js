import prisma from '../lib/prisma.js';
import { normalizePublishTargets, targetsIncludeWebsite } from '../utils/publishTargets.js';
import { isPhotoDocument, photoDocumentOrderBy } from '../utils/photoDocuments.js';
import {
  GENERIC_KITTEN_PHOTO_FALLBACK,
  isResolvablePhotoUrl,
  normalizeKittenPhotoUrl,
} from '../utils/resolveKittenPhotoUrl.js';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function resolveUniqueEventSlug(title, excludeId = null) {
  const base = slugify(title) || 'event';
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.event.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

const publicKittenSelect = {
  id: true,
  name: true,
  primaryPhotoUrl: true,
};

function parseKittenIds(kittenIds) {
  if (!Array.isArray(kittenIds)) return [];
  return [...new Set(
    kittenIds
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0),
  )];
}

async function enrichEventKittens(kittens) {
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

async function syncEventCats(eventId, kittenIds = []) {
  const uniqueIds = parseKittenIds(kittenIds);

  if (uniqueIds.length > 0) {
    const existingCount = await prisma.kitten.count({
      where: { id: { in: uniqueIds } },
    });

    if (existingCount !== uniqueIds.length) {
      const error = new Error('One or more selected kittens were not found');
      error.statusCode = 400;
      throw error;
    }
  }

  await prisma.$transaction([
    prisma.eventCats.deleteMany({ where: { eventId } }),
    ...(uniqueIds.length > 0
      ? [
        prisma.eventCats.createMany({
          data: uniqueIds.map((kittenId) => ({ eventId, kittenId })),
          skipDuplicates: true,
        }),
      ]
      : []),
  ]);
}

async function fetchEventWithCats(eventId) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      eventCats: {
        orderBy: { addedAt: 'asc' },
        include: {
          kitten: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

export async function getAllEvents(_req, res, next) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: {
        eventCats: {
          orderBy: { addedAt: 'asc' },
          include: {
            kitten: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getEventById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        eventCats: {
          orderBy: { addedAt: 'asc' },
          include: {
            kitten: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function getPublicEventBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        slug,
        isPublic: true,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        endDate: true,
        location: true,
        description: true,
        eventCats: {
          orderBy: { addedAt: 'asc' },
          select: {
            kitten: {
              select: publicKittenSelect,
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { eventCats, ...eventData } = event;
    const kittens = await enrichEventKittens(
      eventCats.map(({ kitten }) => kitten),
    );

    res.json({
      ...eventData,
      kittens: kittens.map((kitten) => ({
        id: kitten.id,
        name: kitten.name,
        slug: String(kitten.id),
        primaryPhotoUrl: kitten.primaryPhotoUrl,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const {
      title,
      date,
      endDate,
      location,
      description,
      isPublic,
      publishTargets,
      status,
      slug,
      kittenIds,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    const normalizedTargets = publishTargets !== undefined
      ? normalizePublishTargets(publishTargets)
      : (isPublic ? ['WEBSITE'] : []);

    const event = await prisma.event.create({
      data: {
        title,
        slug: slug ? slugify(slug) : await resolveUniqueEventSlug(title),
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        location: location ?? '',
        description: description ?? '',
        publishTargets: normalizedTargets,
        isPublic: targetsIncludeWebsite(normalizedTargets),
        status: status ?? (targetsIncludeWebsite(normalizedTargets) ? 'PUBLISHED' : 'DRAFT'),
      },
    });

    if (kittenIds !== undefined) {
      await syncEventCats(event.id, kittenIds);
    }

    const hydrated = await fetchEventWithCats(event.id);
    res.status(201).json(hydrated);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const {
      title,
      date,
      endDate,
      location,
      description,
      isPublic,
      publishTargets,
      status,
      slug,
      kittenIds,
    } = req.body;

    const data = {
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(location !== undefined && { location }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
    };

    if (slug !== undefined) {
      data.slug = slugify(slug) || await resolveUniqueEventSlug(title || 'event', id);
    } else if (title !== undefined) {
      data.slug = await resolveUniqueEventSlug(title, id);
    }

    if (publishTargets !== undefined) {
      data.publishTargets = normalizePublishTargets(publishTargets);
      data.isPublic = targetsIncludeWebsite(data.publishTargets);
      if (status === undefined && data.isPublic) {
        data.status = 'PUBLISHED';
      }
    } else if (isPublic !== undefined) {
      data.isPublic = Boolean(isPublic);
    }

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    if (kittenIds !== undefined) {
      await syncEventCats(event.id, kittenIds);
    }

    const hydrated = await fetchEventWithCats(event.id);
    res.json(hydrated);
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Event not found' });
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    await prisma.event.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Event not found' });
    next(error);
  }
}

export async function linkKittenToEvent(req, res, next) {
  try {
    const eventId = Number.parseInt(req.params.eventId, 10);
    const kittenId = Number.parseInt(req.body.kittenId, 10);
    const { notes } = req.body;

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Valid eventId is required' });
    }

    if (!Number.isInteger(kittenId) || kittenId <= 0) {
      return res.status(400).json({ error: 'Valid kittenId is required' });
    }

    const [event, kitten] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }),
      prisma.kitten.findUnique({ where: { id: kittenId }, select: { id: true } }),
    ]);

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const link = await prisma.eventCats.upsert({
      where: {
        eventId_kittenId: { eventId, kittenId },
      },
      create: {
        eventId,
        kittenId,
        notes: notes ?? null,
      },
      update: {
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        kitten: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(link);
  } catch (error) {
    next(error);
  }
}

export async function rsvpForEvent(req, res, next) {
  try {
    const { slug } = req.params;
    const { name, email } = req.body;

    if (typeof name !== 'string' || typeof email !== 'string' || !name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    const event = await prisma.event.findFirst({
      where: {
        slug,
        isPublic: true,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const rsvp = await prisma.eventRSVP.create({
      data: {
        eventId: event.id,
        name: trimmedName,
        email: normalizedEmail,
      },
    });

    res.status(201).json({
      id: rsvp.id,
      eventId: rsvp.eventId,
      createdAt: rsvp.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function unlinkKittenFromEvent(req, res, next) {
  try {
    const eventId = Number.parseInt(req.params.eventId, 10);
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Valid eventId is required' });
    }

    if (!Number.isInteger(kittenId) || kittenId <= 0) {
      return res.status(400).json({ error: 'Valid kittenId is required' });
    }

    const existing = await prisma.eventCats.findUnique({
      where: {
        eventId_kittenId: { eventId, kittenId },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event cat link not found' });
    }

    await prisma.eventCats.delete({
      where: {
        eventId_kittenId: { eventId, kittenId },
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
