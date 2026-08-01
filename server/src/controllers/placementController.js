import prisma from '../lib/prisma.js';
import { createPlacementSchema, formatZodError } from '../validations/fosterValidation.js';
import { parsePacificDateOnly } from '../utils/pacificDate.js';
import { TERMINAL_KITTEN_STATUSES } from '../validations/kittenValidation.js';

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

function parsePlacementDate(value, fieldLabel) {
  if (value == null || value === '') return null;
  const parsed = parsePacificDateOnly(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    const err = new Error(`Invalid ${fieldLabel}`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

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
    const intake = parsePlacementDate(intakeDate, 'intake date');

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

    const keepTerminalStatus = TERMINAL_KITTEN_STATUSES.includes(kitten.status);

    const placement = await prisma.$transaction(async (tx) => {
      // Close only the SENDING foster's open placement(s) — never the receiving one.
      await tx.placement.updateMany({
        where: {
          kittenId,
          dischargeDate: null,
          fosterId: { not: fosterId },
        },
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

      // Placement start date must NOT overwrite organization intake date.
      // Terminal outcomes keep their status; foster can still be re-added (CR-76).
      await tx.kitten.update({
        where: { id: kittenId },
        data: {
          currentFosterId: fosterId,
          ...(keepTerminalStatus ? {} : { status: 'In Foster Care' }),
        },
      });

      return created;
    });

    res.status(201).json(placement);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

export async function updatePlacement(req, res, next) {
  try {
    const fosterId = Number.parseInt(req.params.id, 10);
    const placementId = Number.parseInt(req.params.placementId, 10);
    const { intakeDate, dischargeDate, dischargeType, notes } = req.body;

    const placement = await prisma.placement.findFirst({
      where: { id: placementId, fosterId },
    });
    if (!placement) return res.status(404).json({ error: 'Placement not found' });

    const data = {};
    if (intakeDate !== undefined) {
      data.intakeDate = parsePlacementDate(intakeDate, 'intake date');
    }
    if (dischargeDate !== undefined) {
      data.dischargeDate = dischargeDate === null || dischargeDate === ''
        ? null
        : parsePlacementDate(dischargeDate, 'discharge date');
    }
    if (dischargeType !== undefined) {
      data.dischargeType = dischargeType?.trim() || null;
    }
    if (notes !== undefined) {
      data.notes = typeof notes === 'string' ? notes : '';
    }

    const updated = await prisma.placement.update({
      where: { id: placementId },
      data,
      include: placementInclude,
    });

    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

// Standalone "End Placement" action. Distinct from createFosterPlacement's
// auto-discharge above (which only ever fires as a side effect of
// reassigning a kitten to a *new* foster) - this is the first explicit way
// to end an active placement on its own, with no reassignment involved.
// Does not touch kitten.status; the client prompts staff to confirm/update
// status separately after a successful discharge.
//
// Keep currentFosterId so list/filter/profile still show who had the cat.
// Foster capacity is driven by open placements (dischargeDate null), not
// currentFosterId — clearing it made Adopted / In Socialization cats look
// unassigned and broke foster filters.
export async function dischargePlacement(req, res, next) {
  try {
    const fosterId = Number.parseInt(req.params.id, 10);
    const placementId = Number.parseInt(req.params.placementId, 10);
    const { dischargeDate, dischargeType } = req.body;

    const placement = await prisma.placement.findFirst({
      where: { id: placementId, fosterId },
    });

    if (!placement) return res.status(404).json({ error: 'Placement not found' });
    if (placement.dischargeDate) {
      return res.status(400).json({ error: 'Placement is already discharged' });
    }

    const discharge = dischargeDate
      ? parsePlacementDate(dischargeDate, 'discharge date')
      : parsePacificDateOnly(new Date()) || new Date();

    const updated = await prisma.placement.update({
      where: { id: placementId },
      data: {
        dischargeDate: discharge,
        dischargeType: dischargeType?.trim() || 'Discharged',
      },
      include: placementInclude,
    });

    res.json(updated);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}
