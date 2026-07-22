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

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeDrugPayload(drug, index) {
  const drugName = typeof drug.drugName === 'string' ? drug.drugName.trim() : '';
  const startDayOffset = parseNonNegativeInt(drug.startDayOffset);
  const endDayOffset = parseNonNegativeInt(drug.endDayOffset);
  const frequencyPerDay = parsePositiveInt(drug.frequencyPerDay);

  if (!drugName) {
    return { error: `Drug line ${index + 1} requires a drug name` };
  }

  if (startDayOffset === null || endDayOffset === null) {
    return { error: `Drug line ${index + 1} requires valid day offsets` };
  }

  if (frequencyPerDay === null) {
    return { error: `Drug line ${index + 1} requires frequencyPerDay of at least 1` };
  }

  if (endDayOffset < startDayOffset) {
    return { error: `Drug line ${index + 1} has endDayOffset before startDayOffset` };
  }

  return {
    data: {
      drugName,
      dosage: typeof drug.dosage === 'string' ? drug.dosage.trim() : '',
      route: typeof drug.route === 'string' ? drug.route.trim() : '',
      startDayOffset,
      endDayOffset,
      frequencyPerDay,
      instructions: typeof drug.instructions === 'string' ? drug.instructions.trim() : '',
      sortOrder: index,
    },
  };
}

export async function getAllProtocols(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';

    const protocols = await prisma.protocol.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        drugs: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { activeProtocols: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(protocols);
  } catch (error) {
    next(error);
  }
}

export async function createProtocol(req, res, next) {
  try {
    const { name, description, drugs } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!trimmedName) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!Array.isArray(drugs) || drugs.length === 0) {
      return res.status(400).json({ error: 'At least one drug line is required' });
    }

    const drugRows = [];
    for (let index = 0; index < drugs.length; index += 1) {
      const result = normalizeDrugPayload(drugs[index], index);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      drugRows.push(result.data);
    }

    const protocol = await prisma.protocol.create({
      data: {
        name: trimmedName,
        description: typeof description === 'string' ? description.trim() : '',
        drugs: {
          create: drugRows,
        },
      },
      include: {
        drugs: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.status(201).json(protocol);
  } catch (error) {
    next(error);
  }
}

// Updates a protocol's name/description and, optionally, its drug lines.
// Drug lines are matched by id: existing lines with a matching id are
// updated in place, lines without an id are created, and existing lines
// left out of the payload are removed - but ONLY if no ProtocolDose rows
// reference them yet. ProtocolDrug.doses uses onDelete: Restrict, so
// deleting an in-use drug line would fail at the database level anyway;
// we check first and return a clear 400 instead of letting that surface
// as a raw FK error. Once a protocol has been activated on a kitten,
// deactivateProtocol (soft delete) is the safe way to retire it.
export async function updateProtocol(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Valid protocol id is required' });
    }

    const existing = await prisma.protocol.findUnique({
      where: { id },
      include: { drugs: true },
    });
    if (!existing) return res.status(404).json({ error: 'Protocol not found' });

    const { name, description, drugs } = req.body;
    const data = {};

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (!trimmedName) return res.status(400).json({ error: 'name is required' });
      data.name = trimmedName;
    }

    if (description !== undefined) {
      data.description = typeof description === 'string' ? description.trim() : '';
    }

    let drugRows = null;
    let removedIds = [];

    if (drugs !== undefined) {
      if (!Array.isArray(drugs) || drugs.length === 0) {
        return res.status(400).json({ error: 'At least one drug line is required' });
      }

      drugRows = [];
      for (let index = 0; index < drugs.length; index += 1) {
        const result = normalizeDrugPayload(drugs[index], index);
        if (result.error) {
          return res.status(400).json({ error: result.error });
        }
        const existingId = Number.parseInt(drugs[index]?.id, 10);
        drugRows.push({
          id: Number.isInteger(existingId) && existingId > 0 ? existingId : null,
          data: result.data,
        });
      }

      const existingDrugIds = existing.drugs.map((drug) => drug.id);
      const keptIds = drugRows
        .filter((row) => row.id !== null && existingDrugIds.includes(row.id))
        .map((row) => row.id);
      removedIds = existingDrugIds.filter((drugId) => !keptIds.includes(drugId));
    }

    const protocol = await prisma.$transaction(async (tx) => {
      if (removedIds.length > 0) {
        const dosesInUse = await tx.protocolDose.count({
          where: { protocolDrugId: { in: removedIds } },
        });
        if (dosesInUse > 0) {
          throw Object.assign(
            new Error(
              'One or more drug lines already have recorded doses and cannot be removed. Deactivate the protocol instead.',
            ),
            { statusCode: 400 },
          );
        }
        await tx.protocolDrug.deleteMany({ where: { id: { in: removedIds } } });
      }

      if (drugRows) {
        for (const row of drugRows) {
          if (row.id) {
            await tx.protocolDrug.update({ where: { id: row.id }, data: row.data });
          } else {
            await tx.protocolDrug.create({ data: { ...row.data, protocolId: id } });
          }
        }
      }

      return tx.protocol.update({
        where: { id },
        data,
        include: {
          drugs: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    res.json(protocol);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Protocol not found' });
    next(error);
  }
}

// Soft delete - Protocol has activeProtocols on onDelete: Restrict, so a
// hard delete would fail anyway once a protocol has ever been activated on
// a kitten. Flips isActive to false; getAllProtocols excludes inactive
// protocols by default (pass ?includeInactive=true to see them).
export async function deactivateProtocol(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Valid protocol id is required' });
    }

    const protocol = await prisma.protocol.update({
      where: { id },
      data: { isActive: false },
      include: {
        drugs: { orderBy: { sortOrder: 'asc' } },
      },
    });

    res.json(protocol);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Protocol not found' });
    next(error);
  }
}

export async function getKittenActiveProtocols(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    if (!Number.isInteger(kittenId) || kittenId <= 0) {
      return res.status(400).json({ error: 'Valid kittenId is required' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId }, select: { id: true } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const activeProtocols = await prisma.activeProtocol.findMany({
      where: { kittenId },
      orderBy: [{ status: 'asc' }, { activationDate: 'desc' }],
      include: {
        protocol: {
          select: { id: true, name: true, description: true },
        },
        activatedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { doses: true },
        },
      },
    });

    res.json(activeProtocols);
  } catch (error) {
    next(error);
  }
}

export async function getKittenProtocolDoses(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    if (!Number.isInteger(kittenId) || kittenId <= 0) {
      return res.status(400).json({ error: 'Valid kittenId is required' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId }, select: { id: true } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const doses = await prisma.protocolDose.findMany({
      where: {
        activeProtocol: { kittenId },
      },
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
        activeProtocol: {
          include: {
            protocol: {
              select: { id: true, name: true },
            },
          },
        },
        administeredBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json(doses);
  } catch (error) {
    next(error);
  }
}

export async function markProtocolDoseGiven(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const doseId = Number.parseInt(req.params.doseId, 10);
    const administeredById = req.user?.id;

    if (!Number.isInteger(kittenId) || kittenId <= 0) {
      return res.status(400).json({ error: 'Valid kittenId is required' });
    }

    if (!Number.isInteger(doseId) || doseId <= 0) {
      return res.status(400).json({ error: 'Valid doseId is required' });
    }

    if (!administeredById) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existing = await prisma.protocolDose.findFirst({
      where: {
        id: doseId,
        activeProtocol: { kittenId },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Protocol dose not found for this kitten' });
    }

    const dose = await prisma.$transaction(async (tx) => {
      const updated = await tx.protocolDose.update({
        where: { id: doseId },
        data: {
          status: 'GIVEN',
          administeredAt: new Date(),
          administeredById,
        },
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
          activeProtocol: {
            include: {
              protocol: {
                select: { id: true, name: true },
              },
            },
          },
          administeredBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      const remainingDoses = await tx.protocolDose.count({
        where: {
          activeProtocolId: updated.activeProtocolId,
          status: { not: 'GIVEN' },
        },
      });

      if (remainingDoses === 0 && updated.activeProtocol.status === 'ACTIVE') {
        await tx.activeProtocol.update({
          where: { id: updated.activeProtocolId },
          data: { status: 'COMPLETED' },
        });
        updated.activeProtocol.status = 'COMPLETED';
      }

      return updated;
    });

    res.json(dose);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Protocol dose not found' });
    next(error);
  }
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
