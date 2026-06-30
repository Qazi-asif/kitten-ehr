import prisma from '../lib/prisma.js';

const publicKittenSelect = {
  id: true,
  name: true,
  status: true,
  rescueStory: true,
  websiteFeaturedComment: true,
  dateOfBirth: true,
  sex: true,
  fixedStatus: true,
  breed: true,
  color: true,
  fivFelvStatus: true,
  specialNeeds: true,
  primaryPhotoUrl: true,
};

const publicWebsiteFilter = { publishTargets: { has: 'WEBSITE' } };

export async function getPublicKittens(_req, res, next) {
  try {
    const kittens = await prisma.kitten.findMany({
      where: publicWebsiteFilter,
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
      where: { id, ...publicWebsiteFilter },
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
      prisma.kitten.count({ where: publicWebsiteFilter }),
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
      where: publicWebsiteFilter,
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
      where: publicWebsiteFilter,
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

export async function getPublicKittenPhotos(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicWebsiteFilter },
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

    if (kitten.primaryPhotoUrl) {
      gallery.push({
        id: 'primary',
        fileUrl: kitten.primaryPhotoUrl,
        isPrimaryPhoto: true,
      });
      seen.add(kitten.primaryPhotoUrl);
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
      where: { id, ...publicWebsiteFilter },
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
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          orgName: 'Pawsitive Transformations',
          missionStatement: '',
          defaultDonationAmount: 50,
          amazonWishlistUrl: '',
          chewyWishlistUrl: '',
          facebookUrl: '',
          instagramUrl: '',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
}
