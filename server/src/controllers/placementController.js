import prisma from '../lib/prisma.js';
import { createPlacementSchema, formatZodError } from '../validations/fosterValidation.js';

const placementInclude = {
  kitten: {
    select: {
      id: true,
      name: true,
      status: true,
      breed: true,
      color: true,
    },
  },
  foster: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
};

export async function getFosterPlacements(req, res, next) {
  try {
    const fosterId = Number.parseInt(req.params.id, 10);

    const foster = await prisma.foster.findUnique({ where: { id: fosterId } });
    if (!foster) return res.status(404).json({ error: 'Foster not found' });

    const placements = await prisma.placement.findMany({
      where: { fosterId },
      orderBy: { intakeDate: 'desc' },
      include: placementInclude,
    });

    res.json(placements);
  } catch (error) {
    next(error);
  }
}

export async function getKittenPlacements(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const placements = await prisma.placement.findMany({
      where: { kittenId },
      orderBy: { intakeDate: 'desc' },
      include: placementInclude,
    });

    res.json(placements);
  } catch (error) {
    next(error);
  }
}

export async function createFosterPlacement(req, res, next) {
  try {
    const fosterId = Number.parseInt(req.params.id, 10);
    const parsed = createPlacementSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { kittenId, intakeDate, notes } = parsed.data;
    const intake = new Date(intakeDate);

    if (Number.isNaN(intake.getTime())) {
      return res.status(400).json({ error: 'Invalid intake date' });
    }

    const [foster, kitten] = await Promise.all([
      prisma.foster.findUnique({ where: { id: fosterId } }),
      prisma.kitten.findUnique({ where: { id: kittenId } }),
    ]);

    if (!foster) return res.status(404).json({ error: 'Foster not found' });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const activePlacements = await prisma.placement.count({
      where: { fosterId, dischargeDate: null },
    });

    if (foster.maxKittens > 0 && activePlacements >= foster.maxKittens) {
      return res.status(400).json({ error: 'Foster is at maximum capacity' });
    }

    const placement = await prisma.$transaction(async (tx) => {
      await tx.placement.updateMany({
        where: { kittenId, dischargeDate: null },
        data: {
          dischargeDate: intake,
          dischargeType: 'Transferred',
        },
      });

      const created = await tx.placement.create({
        data: {
          kittenId,
          fosterId,
          intakeDate: intake,
          notes,
        },
        include: placementInclude,
      });

      await tx.kitten.update({
        where: { id: kittenId },
        data: {
          currentFosterId: fosterId,
          status: 'In Foster Care',
        },
      });

      return created;
    });

    res.status(201).json(placement);
  } catch (error) {
    next(error);
  }
}
