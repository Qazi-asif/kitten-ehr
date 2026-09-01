import prisma from '../lib/prisma.js';
import { parsePacificDateOnly } from '../utils/pacificDate.js';

export async function getAllLitters(req, res, next) {
  try {
    const { status = 'active', sort = 'name' } = req.query;
    const where = {};
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    // status === 'all' → no filter

    const orderBy = sort === 'recent'
      ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : [{ name: 'asc' }];

    // Litter has no createdAt historically — fall back to id for "recent"
    const litters = await prisma.litter.findMany({
      where,
      orderBy: sort === 'recent' ? { id: 'desc' } : { name: 'asc' },
      include: {
        _count: { select: { kittens: true } },
      },
    });
    void orderBy;
    res.json(litters);
  } catch (error) {
    next(error);
  }
}

export async function createLitter(req, res, next) {
  try {
    const { name, notes } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: 'name is required',
      });
    }

    const litter = await prisma.litter.create({
      data: {
        name: name.trim(),
        intakeDate: null,
        notes: notes ?? '',
        isActive: true,
      },
    });

    res.status(201).json(litter);
  } catch (error) {
    next(error);
  }
}

export async function updateLitter(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.litter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Litter not found' });

    const data = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      data.name = req.body.name.trim();
    }
    if (typeof req.body.notes === 'string') data.notes = req.body.notes;
    if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
    if (req.body.intakeDate === null) data.intakeDate = null;
    else if (typeof req.body.intakeDate === 'string' && req.body.intakeDate.trim()) {
      data.intakeDate = parsePacificDateOnly(req.body.intakeDate.trim());
    }

    const litter = await prisma.litter.update({
      where: { id },
      data,
      include: { _count: { select: { kittens: true } } },
    });
    res.json(litter);
  } catch (error) {
    next(error);
  }
}

export async function deactivateLitter(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.litter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Litter not found' });

    const litter = await prisma.litter.update({
      where: { id },
      data: { isActive: false },
      include: { _count: { select: { kittens: true } } },
    });
    res.json(litter);
  } catch (error) {
    next(error);
  }
}

export async function activateLitter(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.litter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Litter not found' });

    const litter = await prisma.litter.update({
      where: { id },
      data: { isActive: true },
      include: { _count: { select: { kittens: true } } },
    });
    res.json(litter);
  } catch (error) {
    next(error);
  }
}

/** Hard-delete for mistaken records. Linked kittens keep their records with litterId cleared. */
export async function deleteLitter(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.litter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Litter not found' });

    await prisma.litter.delete({ where: { id } });
    res.status(204).send();
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
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            breed: true,
            color: true,
            coatPattern: true,
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
