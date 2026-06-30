import prisma from '../lib/prisma.js';
import {
  createFosterSchema,
  formatZodError,
  normalizeCapabilityFlags,
} from '../validations/fosterValidation.js';

export async function getAllFosters(_req, res, next) {
  try {
    const fosters = await prisma.foster.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { currentKittens: true, placements: true } },
      },
    });
    res.json(fosters);
  } catch (error) {
    next(error);
  }
}

export async function createFoster(req, res, next) {
  try {
    const parsed = createFosterSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const data = parsed.data;
    const capabilityFlags = normalizeCapabilityFlags(data.capabilityFlags, data.maxKittens);

    const foster = await prisma.foster.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        experienceLevel: data.experienceLevel,
        capabilityFlags,
        maxKittens: data.maxKittens,
        photoUrl: data.photoUrl || null,
        notes: data.notes,
      },
    });

    res.status(201).json(foster);
  } catch (error) {
    next(error);
  }
}

export async function getFosterById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const foster = await prisma.foster.findUnique({
      where: { id },
      include: {
        currentKittens: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            breed: true,
            color: true,
          },
        },
        _count: { select: { placements: true, currentKittens: true } },
      },
    });

    if (!foster) {
      return res.status(404).json({ error: 'Foster not found' });
    }

    res.json(foster);
  } catch (error) {
    next(error);
  }
}
