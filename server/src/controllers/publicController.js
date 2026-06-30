import prisma from '../lib/prisma.js';

const publicKittenSelect = {
  id: true,
  name: true,
  status: true,
  rescueStory: true,
  dateOfBirth: true,
  sex: true,
  fixedStatus: true,
  breed: true,
  color: true,
  fivFelvStatus: true,
  specialNeeds: true,
  primaryPhotoUrl: true,
};

export async function getPublicKittens(_req, res, next) {
  try {
    const kittens = await prisma.kitten.findMany({
      where: { status: 'Available for Adoption' },
      select: publicKittenSelect,
      orderBy: { id: 'asc' },
    });
    res.json(kittens);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, status: 'Available for Adoption' },
      select: publicKittenSelect,
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    res.json(kitten);
  } catch (error) {
    next(error);
  }
}

export async function getPublicStats(_req, res, next) {
  try {
    const [availableKittens, adoptedKittens, activeFosters] = await Promise.all([
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.foster.count({ where: { currentKittens: { some: {} } } }),
    ]);

    res.json({ availableKittens, adoptedKittens, activeFosters });
  } catch (error) {
    next(error);
  }
}

export async function getPublicContent(_req, res, next) {
  try {
    const articles = await prisma.content.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, category: true, createdAt: true },
    });
    res.json(articles);
  } catch (error) {
    next(error);
  }
}

export async function getPublicContentBySlug(req, res, next) {
  try {
    const article = await prisma.content.findUnique({
      where: { slug: req.params.slug },
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
      where: { isPublic: true },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
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

export async function getPublicKittenUpdates(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, status: 'Available for Adoption' },
      select: { id: true },
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const updates = await prisma.update.findMany({
      where: { kittenId: id, isPublic: true },
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
