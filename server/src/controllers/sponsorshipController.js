import prisma from '../lib/prisma.js';

export async function getSponsorshipsByKittenId(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const sponsorships = await prisma.sponsorship.findMany({
      where: { kittenId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sponsorships);
  } catch (error) {
    next(error);
  }
}

export async function createSponsorship(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const { sponsorName, amount, tier } = req.body;

    if (!sponsorName || amount == null || !tier) {
      return res.status(400).json({ error: 'sponsorName, amount, and tier are required' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const sponsorship = await prisma.sponsorship.create({
      data: {
        kittenId,
        sponsorName,
        amount: Number.parseFloat(amount),
        tier,
      },
    });

    res.status(201).json(sponsorship);
  } catch (error) {
    next(error);
  }
}
