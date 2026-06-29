import prisma from '../lib/prisma.js';

export async function getAllLitters(_req, res, next) {
  try {
    const litters = await prisma.litter.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { kittens: true } },
      },
    });
    res.json(litters);
  } catch (error) {
    next(error);
  }
}

export async function createLitter(req, res, next) {
  try {
    const { name, intakeDate, notes } = req.body;

    if (!name || !intakeDate) {
      return res.status(400).json({
        error: 'name and intakeDate are required',
      });
    }

    const litter = await prisma.litter.create({
      data: {
        name,
        intakeDate: new Date(intakeDate),
        notes: notes ?? '',
      },
    });

    res.status(201).json(litter);
  } catch (error) {
    next(error);
  }
}

export async function getLitterById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const litter = await prisma.litter.findUnique({
      where: { id },
      include: {
        kittens: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            breed: true,
            color: true,
            currentFoster: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!litter) {
      return res.status(404).json({ error: 'Litter not found' });
    }

    res.json(litter);
  } catch (error) {
    next(error);
  }
}
