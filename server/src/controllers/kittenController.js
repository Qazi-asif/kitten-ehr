import prisma from '../lib/prisma.js';

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
    } = req.body;

    if (!name || !breed) {
      return res.status(400).json({
        error: 'name and breed are required',
      });
    }

    const parsedLitterId = litterId ? Number.parseInt(litterId, 10) : null;
    const parsedFosterId = (currentFosterId ?? fosterId)
      ? Number.parseInt(currentFosterId ?? fosterId, 10)
      : null;

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
        status: status ?? 'In Foster Care',
        breed,
        color: color ?? '',
        litterId: parsedLitterId,
        currentFosterId: parsedFosterId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        sex: sex ?? '',
        fixedStatus: fixedStatus ?? '',
        rescueStory: rescueStory ?? '',
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
    const { primaryPhotoUrl } = req.body;

    const existing = await prisma.kitten.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Kitten not found' });

    const kitten = await prisma.kitten.update({
      where: { id },
      data: {
        ...(primaryPhotoUrl !== undefined && { primaryPhotoUrl }),
      },
      include: kittenIncludes,
    });

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
        where: { status: { notIn: ['Adopted', 'Deceased', 'Transferred'] } },
      }),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      prisma.application.count({ where: { status: 'Under Review' } }),
      prisma.foster.count({
        where: { currentKittens: { some: {} } },
      }),
      prisma.placement.count({
        where: {
          dischargeType: 'Adopted',
          dischargeDate: { gte: yearStart },
        },
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
