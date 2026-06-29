import prisma from '../lib/prisma.js';

export async function getAllEvents(_req, res, next) {
  try {
    const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getEventById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const { title, date, location, description, isPublic } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        location: location ?? '',
        description: description ?? '',
        isPublic: Boolean(isPublic),
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
    const { title, date, location, description, isPublic } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
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
