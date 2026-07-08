import prisma from '../lib/prisma.js';
import { normalizePublishTargets, targetsIncludeWebsite } from '../utils/publishTargets.js';

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

    res.json({
      ...eventData,
      kittens: eventCats.map(({ kitten }) => ({
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
        status: status ?? 'DRAFT',
      },
    });

    res.status(201).json(event);
  } catch (error) {
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
    } else if (isPublic !== undefined) {
      data.isPublic = Boolean(isPublic);
    }

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    res.json(event);
  } catch (error) {
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
