import prisma from '../lib/prisma.js';

export async function getAllFosters(_req, res, next) {
  try {
    const fosters = await prisma.foster.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { currentKittens: true } },
      },
    });
    res.json(fosters);
  } catch (error) {
    next(error);
  }
}

export async function createFoster(req, res, next) {
  try {
    const {
      name,
      phone,
      email,
      address,
      emergencyContact,
      experienceLevel,
      capabilityFlags,
      notes,
    } = req.body;

    if (!name || !phone || !email || !address) {
      return res.status(400).json({
        error: 'name, phone, email, and address are required',
      });
    }

    const foster = await prisma.foster.create({
      data: {
        name,
        phone,
        email,
        address,
        emergencyContact: emergencyContact ?? '',
        experienceLevel: experienceLevel ?? '',
        capabilityFlags: capabilityFlags ?? '',
        notes: notes ?? '',
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
        placements: {
          orderBy: { intakeDate: 'desc' },
          include: {
            kitten: { select: { id: true, name: true } },
          },
        },
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
