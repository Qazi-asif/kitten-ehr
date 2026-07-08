import prisma from '../lib/prisma.js';

function stripToUtcMidnight(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function buildScheduledDateUtcMidnight(activationMidnightUtc, dayOffset) {
  return new Date(Date.UTC(
    activationMidnightUtc.getUTCFullYear(),
    activationMidnightUtc.getUTCMonth(),
    activationMidnightUtc.getUTCDate() + dayOffset,
  ));
}

export async function activateProtocol(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const { protocolId: rawProtocolId, activationDate } = req.body;
    const protocolId = Number.parseInt(rawProtocolId, 10);
    const activatedById = req.user?.id;

    if (!Number.isInteger(kittenId) || kittenId <= 0) {
      return res.status(400).json({ error: 'Valid kittenId is required' });
    }

    if (!Number.isInteger(protocolId) || protocolId <= 0) {
      return res.status(400).json({ error: 'Valid protocolId is required' });
    }

    if (!activationDate) {
      return res.status(400).json({ error: 'activationDate is required' });
    }

    if (!activatedById) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const activationMidnightUtc = stripToUtcMidnight(activationDate);
    if (!activationMidnightUtc) {
      return res.status(400).json({ error: 'activationDate must be a valid date' });
    }

    const [kitten, protocol] = await Promise.all([
      prisma.kitten.findUnique({ where: { id: kittenId }, select: { id: true } }),
      prisma.protocol.findUnique({
        where: { id: protocolId },
        include: {
          drugs: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
    ]);

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    if (!protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }

    if (!protocol.isActive) {
      return res.status(400).json({ error: 'Protocol is not active' });
    }

    if (protocol.drugs.length === 0) {
      return res.status(400).json({ error: 'Protocol has no drug lines configured' });
    }

    const doseRows = [];

    for (const drug of protocol.drugs) {
      if (drug.frequencyPerDay < 1) {
        return res.status(400).json({
          error: `Protocol drug "${drug.drugName}" must have frequencyPerDay of at least 1`,
        });
      }

      if (drug.endDayOffset < drug.startDayOffset) {
        return res.status(400).json({
          error: `Protocol drug "${drug.drugName}" has endDayOffset before startDayOffset`,
        });
      }

      for (let dayOffset = drug.startDayOffset; dayOffset <= drug.endDayOffset; dayOffset += 1) {
        const scheduledDate = buildScheduledDateUtcMidnight(activationMidnightUtc, dayOffset);

        for (let doseNumberInDay = 1; doseNumberInDay <= drug.frequencyPerDay; doseNumberInDay += 1) {
          doseRows.push({
            protocolDrugId: drug.id,
            scheduledDate,
            doseNumberInDay,
            status: 'SCHEDULED',
          });
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeProtocol = await tx.activeProtocol.create({
        data: {
          protocolId,
          kittenId,
          activatedById,
          activationDate: activationMidnightUtc,
          status: 'ACTIVE',
        },
        include: {
          protocol: {
            select: { id: true, name: true, description: true },
          },
          activatedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      if (doseRows.length > 0) {
        await tx.protocolDose.createMany({
          data: doseRows.map((row) => ({
            activeProtocolId: activeProtocol.id,
            protocolDrugId: row.protocolDrugId,
            scheduledDate: row.scheduledDate,
            doseNumberInDay: row.doseNumberInDay,
            status: row.status,
          })),
          skipDuplicates: true,
        });
      }

      const doses = await tx.protocolDose.findMany({
        where: { activeProtocolId: activeProtocol.id },
        orderBy: [
          { scheduledDate: 'asc' },
          { doseNumberInDay: 'asc' },
        ],
        include: {
          protocolDrug: {
            select: {
              id: true,
              drugName: true,
              dosage: true,
              route: true,
              instructions: true,
            },
          },
        },
      });

      return { activeProtocol, dosesGenerated: doses.length, doses };
    });

    res.status(201).json({
      activeProtocol: result.activeProtocol,
      dosesGenerated: result.dosesGenerated,
      doses: result.doses,
    });
  } catch (error) {
    next(error);
  }
}
