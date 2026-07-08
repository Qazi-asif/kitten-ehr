import prisma from '../lib/prisma.js';

export async function getDashboardMetrics(_req, res, next) {
  try {
    const [
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      activeProtocols,
    ] = await Promise.all([
      prisma.kitten.count(),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      prisma.foster.count(),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.kitten.count({ where: { intakeSource: { contains: 'Euthanasia' } } }),
      prisma.activeProtocol.count(),
    ]);

    res.json({
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      activeProtocols,
    });
  } catch (error) {
    next(error);
  }
}
