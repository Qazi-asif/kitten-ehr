import prisma from '../lib/prisma.js';
import {
  createKittenSchema,
  formatZodError,
  updateKittenSchema,
} from '../validations/kittenValidation.js';
import { normalizePublishTargets, targetsIncludeWebsite } from '../utils/publishTargets.js';
import { isUnknownPublishTargetsError, withLegacyWebsiteFlag } from '../utils/prismaPublishTargets.js';

const kittenIncludes = {
  litter: { select: { id: true, name: true } },
  currentFoster: { select: { id: true, name: true, phone: true } },
};

export async function getAllKittens(_req, res) {
  try {
    const kittens = await prisma.kitten.findMany({
      orderBy: { id: 'asc' },
      include: kittenIncludes,
    });
    res.json(kittens);
  } catch (error) {
    console.error('Failed to fetch kittens:', error);
    res.status(500).json({ error: 'Failed to fetch kittens' });
  }
}

export async function createKitten(req, res, next) {
  try {
    const parsed = createKittenSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const {
      name,
      status,
      breed,
      color,
      litterId,
      currentFosterId,
      fosterId,
      dateOfBirth,
      sex,
      fixedStatus,
      rescueStory,
    } = parsed.data;

    const parsedLitterId = litterId ?? null;
    const parsedFosterId = currentFosterId ?? fosterId ?? null;

    if (parsedLitterId) {
      const litter = await prisma.litter.findUnique({ where: { id: parsedLitterId } });
      if (!litter) return res.status(400).json({ error: 'Litter not found' });
    }

    if (parsedFosterId) {
      const foster = await prisma.foster.findUnique({ where: { id: parsedFosterId } });
      if (!foster) return res.status(400).json({ error: 'Foster not found' });
    }

    const kitten = await prisma.kitten.create({
      data: {
        name,
        status,
        breed,
        color,
        litterId: parsedLitterId,
        currentFosterId: parsedFosterId,
        dateOfBirth: dateOfBirth ?? null,
        sex,
        fixedStatus,
        rescueStory,
      },
      include: kittenIncludes,
    });

    if (parsedFosterId) {
      await prisma.placement.create({
        data: {
          kittenId: kitten.id,
          fosterId: parsedFosterId,
          intakeDate: new Date(),
        },
      });
    }

    res.status(201).json(kitten);
  } catch (error) {
    next(error);
  }
}

export async function getKittenById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findUnique({
      where: { id },
      include: kittenIncludes,
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    res.json(kitten);
  } catch (error) {
    next(error);
  }
}

export async function updateKitten(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const parsed = updateKittenSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const existing = await prisma.kitten.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Kitten not found' });

    const body = parsed.data;
    const data = { ...body };

    if (body.litterId !== undefined) {
      data.litterId = body.litterId ?? null;
    }
    if (body.currentFosterId !== undefined) {
      data.currentFosterId = body.currentFosterId ?? null;
    }
    if (body.publishTargets !== undefined) {
      data.publishTargets = normalizePublishTargets(body.publishTargets);
      data.isListedOnWebsite = targetsIncludeWebsite(data.publishTargets);
    } else if (body.isListedOnWebsite !== undefined) {
      const currentTargets = normalizePublishTargets(existing.publishTargets);
      data.isListedOnWebsite = body.isListedOnWebsite;
      if (body.isListedOnWebsite && !currentTargets.includes('WEBSITE')) {
        data.publishTargets = [...currentTargets, 'WEBSITE'];
      }
      if (!body.isListedOnWebsite) {
        data.publishTargets = currentTargets.filter((target) => target !== 'WEBSITE');
      }
    }

    delete data.weightGrams;

    let kitten;
    try {
      kitten = await prisma.kitten.update({
        where: { id },
        data,
        include: kittenIncludes,
      });
    } catch (error) {
      if (!isUnknownPublishTargetsError(error) || data.publishTargets === undefined) {
        throw error;
      }

      kitten = await prisma.kitten.update({
        where: { id },
        data: withLegacyWebsiteFlag(data, data.publishTargets),
        include: kittenIncludes,
      });
    }

    res.json(kitten);
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(_req, res, next) {
  try {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const [
      activeKittens,
      availableForAdoption,
      pendingAdoptions,
      activeFosters,
      adoptionsThisYear,
    ] = await Promise.all([
      prisma.kitten.count({
        where: { status: { in: ['In Foster Care', 'Medical Hold'] } },
      }),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      prisma.application.count({ where: { status: { in: ['New', 'Under Review'] } } }),
      prisma.foster.count({ where: { currentKittens: { some: {} } } }),
      prisma.kitten.count({
        where: { status: 'Adopted', createdAt: { gte: yearStart } },
      }),
    ]);

    res.json({
      activeKittens,
      availableForAdoption,
      pendingAdoptions,
      activeFosters,
      adoptionsThisYear,
    });
  } catch (error) {
    next(error);
  }
}
