import prisma from '../lib/prisma.js';

export async function getWeightsByKittenId(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const logs = await prisma.weightLog.findMany({
      where: { kittenId },
      orderBy: { date: 'desc' },
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
}

export async function createWeightLog(req, res, next) {
  try {
    const { kittenId, weightGrams, weightOz, date, loggedBy, notes } = req.body;

    if (!kittenId || !date) {
      return res.status(400).json({ error: 'kittenId and date are required' });
    }

    const parsedKittenId = Number.parseInt(kittenId, 10);
    const kitten = await prisma.kitten.findUnique({ where: { id: parsedKittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    let grams = weightGrams ? Number.parseFloat(weightGrams) : null;
    let oz = weightOz ? Number.parseFloat(weightOz) : null;

    if (grams && !oz) oz = grams / 28.3495;
    if (oz && !grams) grams = oz * 28.3495;

    if (!grams || !oz || grams <= 0) {
      return res.status(400).json({ error: 'weightGrams or weightOz must be a positive number' });
    }

    const log = await prisma.weightLog.create({
      data: {
        kittenId: parsedKittenId,
        date: new Date(date),
        weightGrams: grams,
        weightOz: oz,
        loggedBy: loggedBy ?? 'Admin',
        notes: notes ?? '',
      },
    });

    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
}
