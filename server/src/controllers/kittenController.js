import prisma from '../lib/prisma.js';
import {
  createKittenSchema,
  formatZodError,
  TERMINAL_KITTEN_STATUSES,
  updateKittenSchema,
} from '../validations/kittenValidation.js';
import { normalizePublishTargets, targetsIncludeWebsite } from '../utils/publishTargets.js';
import { isUnknownPublishTargetsError, withLegacyWebsiteFlag } from '../utils/prismaPublishTargets.js';
import {
  kittenListSelect,
  latestPlacementFosterSelect,
  serializeKittenForDetail,
  serializeKittenForList,
  enrichKittensWithPhotos,
} from '../utils/kittenSerialization.js';
import { evaluateKittenFlags } from '../services/medicalAutomation.js';
import { buildDashboardInsights } from '../services/dashboardInsights.js';
import { getCachedResponse, setCachedResponse, invalidateCacheByPrefix } from '../utils/responseCache.js';
import { parsePacificDateOnly, toPacificDateString } from '../utils/pacificDate.js';

const DASHBOARD_STATS_TTL_MS = 60 * 1000;

const TERMINAL_DISCHARGE_TYPE = {
  Adopted: 'Adopted',
  Transferred: 'Transferred',
  Deceased: 'Deceased',
  Released: 'Released',
};

/** Terminal statuses that default outcomeDate to now when not explicitly provided. */
const OUTCOME_DATE_STATUSES = ['Adopted', 'Deceased', 'Released'];

const kittenIncludes = {
  litter: { select: { id: true, name: true } },
  currentFoster: { select: { id: true, name: true, phone: true } },
  bondedWithKitten: { select: { id: true, name: true } },
  placements: latestPlacementFosterSelect,
};

export async function getAllKittens(req, res) {
  try {
    const usePagination = req.query.page != null
      || req.query.limit != null
      || req.query.search
      || (req.query.status && req.query.status !== 'All')
      || req.query.fosterId
      || req.query.litterId
      || req.query.sort
      || req.query.ids;

    const where = buildKittenListWhere(req.query);

    if (!usePagination) {
      // CR-90: every kitten <select>/dropdown fed by this unpaginated shape
      // (fetchKittens() with no params) should default to name A–Z.
      const kittens = await prisma.kitten.findMany({
        where,
        orderBy: buildKittenListOrderBy(req.query, { fallback: [{ name: 'asc' }, { id: 'asc' }] }),
        select: kittenListSelect,
      });
      const enriched = await enrichKittensWithPhotos(kittens);
      return res.json(enriched.map(serializeKittenForList));
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [total, kittens] = await Promise.all([
      prisma.kitten.count({ where }),
      prisma.kitten.findMany({
        where,
        skip,
        take: limit,
        orderBy: buildKittenListOrderBy(req.query, {
          fallback: [{ name: 'asc' }],
        }),
        select: kittenListSelect,
      }),
    ]);

    const enriched = await enrichKittensWithPhotos(kittens);

    res.json({
      items: enriched.map(serializeKittenForList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('Failed to fetch kittens:', error);
    res.status(500).json({ error: 'Failed to fetch kittens' });
  }
}

function buildKittenListOrderBy(query, { fallback } = {}) {
  const sort = typeof query.sort === 'string' ? query.sort.trim().toLowerCase() : '';

  switch (sort) {
    case 'name':
    case 'name_asc':
      return [{ name: 'asc' }, { id: 'asc' }];
    case 'name_desc':
      return [{ name: 'desc' }, { id: 'desc' }];
    case 'age':
    case 'age_asc':
      // Oldest first (earliest date of birth)
      return [{ dateOfBirth: 'asc' }, { id: 'asc' }];
    case 'age_desc':
      // Youngest first (latest date of birth)
      return [{ dateOfBirth: 'desc' }, { id: 'desc' }];
    case 'gender':
    case 'gender_asc':
    case 'sex':
    case 'sex_asc':
      return [{ sex: 'asc' }, { name: 'asc' }, { id: 'asc' }];
    case 'gender_desc':
    case 'sex_desc':
      return [{ sex: 'desc' }, { name: 'asc' }, { id: 'asc' }];
    default:
      return fallback || [{ intakeDate: 'desc' }, { id: 'desc' }];
  }
}

function buildKittenListWhere(query) {
  const where = {};

  // CR-86: dashboard reminder links filter the list to an explicit set of
  // kitten ids (e.g. /admin/kittens?ids=4,9,12) — bypasses status filtering
  // entirely so terminal-status cats still show if a reminder ever points at one.
  if (typeof query.ids === 'string' && query.ids.trim()) {
    const ids = query.ids
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (ids.length > 0) {
      where.id = { in: ids };
      return where;
    }
  }

  if (query.status && query.status !== 'All') {
    const statuses = String(query.status)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  }

  const litterId = Number.parseInt(query.litterId, 10);
  if (Number.isInteger(litterId) && litterId > 0) {
    where.litterId = litterId;
  }

  const fosterId = Number.parseInt(query.fosterId, 10);
  const hasFosterFilter = Number.isInteger(fosterId) && fosterId > 0;
  // Include current assignment OR any historical placement with this foster
  // so Adopted/Released/Transferred/Deceased cats still appear when filtering.
  const fosterClause = hasFosterFilter
    ? {
        OR: [
          { currentFosterId: fosterId },
          { placements: { some: { fosterId } } },
        ],
      }
    : null;

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const searchClause = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { breed: { contains: search, mode: 'insensitive' } },
        ],
      }
    : null;

  if (fosterClause && searchClause) {
    where.AND = [fosterClause, searchClause];
  } else if (fosterClause) {
    Object.assign(where, fosterClause);
  } else if (searchClause) {
    Object.assign(where, searchClause);
  }

  return where;
}

export async function createKitten(req, res, next) {
  try {
    const parsed = createKittenSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const {
      name,
      status,
      breed,
      color,
      litterId,
      currentFosterId,
      fosterId,
      dateOfBirth,
      sex,
      fixedStatus,
      rescueStory,
      intakeDate,
      intakeSource,
      microchipNumber,
      isTnr,
      isColony,
    } = parsed.data;

    const parsedLitterId = litterId ?? null;
    const parsedFosterId = currentFosterId ?? fosterId ?? null;

    if (parsedLitterId) {
      const litter = await prisma.litter.findUnique({ where: { id: parsedLitterId } });
      if (!litter) return res.status(400).json({ error: 'Litter not found' });
    }

    if (parsedFosterId) {
      const foster = await prisma.foster.findUnique({ where: { id: parsedFosterId } });
      if (!foster) return res.status(400).json({ error: 'Foster not found' });
    }

    const kitten = await prisma.$transaction(async (tx) => {
      const created = await tx.kitten.create({
        data: {
          name,
          status,
          breed,
          color,
          litterId: parsedLitterId,
          currentFosterId: parsedFosterId,
          dateOfBirth: dateOfBirth ?? null,
          sex,
          fixedStatus,
          rescueStory,
          intakeDate: intakeDate ?? new Date(),
          intakeSource: intakeSource ?? '',
          microchipNumber: microchipNumber ?? '',
          isTnr: Boolean(isTnr),
          isColony: Boolean(isColony),
        },
        include: kittenIncludes,
      });

      if (parsedFosterId) {
        await tx.placement.create({
          data: {
            kittenId: created.id,
            fosterId: parsedFosterId,
            intakeDate: new Date(),
          },
        });
      }

      return created;
    });

    // Bust cached public kittens list and dashboard so the new kitten appears immediately
    invalidateCacheByPrefix('public-kittens');
    invalidateCacheByPrefix('public-stats');
    invalidateCacheByPrefix('dashboard-metrics');

    res.status(201).json(kitten);
  } catch (error) {
    next(error);
  }
}

export async function getKittenById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const [kitten, vaccines, weightLogs] = await Promise.all([
      prisma.kitten.findUnique({
        where: { id },
        include: kittenIncludes,
      }),
      prisma.vaccine.findMany({
        where: { kittenId: id },
        orderBy: { dateGiven: 'desc' },
      }),
      prisma.weightLog.findMany({
        where: { kittenId: id },
        orderBy: { date: 'desc' },
      }),
    ]);

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const flags = evaluateKittenFlags(kitten, vaccines, weightLogs);

    res.json({
      ...serializeKittenForDetail(kitten),
      flags,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateKitten(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const parsed = updateKittenSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const existing = await prisma.kitten.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Kitten not found' });

    const body = parsed.data;
    const data = { ...body };

    if (body.litterId !== undefined) {
      data.litterId = body.litterId ?? null;
    }
    if (body.isBondedPair !== undefined) {
      data.isBondedPair = body.isBondedPair;
      if (!body.isBondedPair) {
        data.bondedWithKittenId = null;
        data.bondedWithName = '';
      }
    }
    if (body.bondedWithKittenId !== undefined) {
      data.bondedWithKittenId = body.bondedWithKittenId ?? null;
    }
    if (body.bondedWithName !== undefined) {
      data.bondedWithName = body.bondedWithName?.trim() || '';
    }
    if (body.isMedicalSpecialNeeds !== undefined) {
      data.isMedicalSpecialNeeds = body.isMedicalSpecialNeeds;
    }
    if (body.publishTargets !== undefined) {
      data.publishTargets = normalizePublishTargets(body.publishTargets);
      data.isListedOnWebsite = targetsIncludeWebsite(data.publishTargets);
    } else if (body.isListedOnWebsite !== undefined) {
      const currentTargets = normalizePublishTargets(existing.publishTargets);
      data.isListedOnWebsite = body.isListedOnWebsite;
      if (body.isListedOnWebsite && !currentTargets.includes('WEBSITE')) {
        data.publishTargets = [...currentTargets, 'WEBSITE'];
      }
      if (!body.isListedOnWebsite) {
        data.publishTargets = currentTargets.filter((target) => target !== 'WEBSITE');
      }
    }

    delete data.weightGrams;

    if (data.bondedWithKittenId && data.bondedWithKittenId === id) {
      return res.status(400).json({ error: 'A kitten cannot be bonded with itself' });
    }

    if (data.bondedWithKittenId) {
      const partner = await prisma.kitten.findUnique({
        where: { id: data.bondedWithKittenId },
        select: { id: true },
      });
      if (!partner) return res.status(400).json({ error: 'Bonded partner kitten not found' });
    }

    const previousPartnerId = existing.bondedWithKittenId;
    const nextStatus = data.status ?? existing.status;
    const becomingTerminal = TERMINAL_KITTEN_STATUSES.includes(nextStatus)
      && nextStatus !== existing.status;
    const leavingTerminal = TERMINAL_KITTEN_STATUSES.includes(existing.status)
      && nextStatus !== existing.status
      && !TERMINAL_KITTEN_STATUSES.includes(nextStatus);
    const keepTerminalStatus = TERMINAL_KITTEN_STATUSES.includes(nextStatus);

    const fosterIdProvided = Object.prototype.hasOwnProperty.call(body, 'currentFosterId');
    const nextFosterId = fosterIdProvided ? (body.currentFosterId ?? null) : undefined;
    let fosterChanged = false;

    if (fosterIdProvided) {
      if (nextFosterId != null) {
        const foster = await prisma.foster.findUnique({ where: { id: nextFosterId } });
        if (!foster) return res.status(400).json({ error: 'Foster not found' });
      }
      fosterChanged = nextFosterId !== existing.currentFosterId;
      data.currentFosterId = nextFosterId;
    } else {
      delete data.currentFosterId;
    }

    // Keep currentFosterId on terminal outcomes (Adopted, etc.). Staff clear
    // foster via End Placement / reassignment — do not wipe assignment here.
    if (becomingTerminal) {
      if (OUTCOME_DATE_STATUSES.includes(nextStatus) && data.outcomeDate === undefined) {
        data.outcomeDate = new Date();
      }
    }

    if (nextStatus === 'Transferred' && data.outcomeDetail !== undefined) {
      // Transferred tracks a free-text detail, not a date.
      data.outcomeDate = null;
    }

    if (leavingTerminal) {
      data.outcomeDate = null;
      data.outcomeDetail = null;
    }

    // Match createFosterPlacement: assigning a foster sets In Foster Care unless
    // terminal (or the client explicitly sent a status in this same request).
    if (fosterChanged && nextFosterId != null && !keepTerminalStatus && body.status === undefined) {
      data.status = 'In Foster Care';
    }

    let kitten;
    kitten = await prisma.$transaction(async (tx) => {
      if (fosterChanged) {
        if (nextFosterId != null) {
          const foster = await tx.foster.findUnique({ where: { id: nextFosterId } });
          if (foster?.maxKittens > 0) {
            const activePlacements = await tx.placement.count({
              where: { fosterId: nextFosterId, dischargeDate: null },
            });
            if (activePlacements >= foster.maxKittens) {
              const err = new Error('Foster is at maximum capacity');
              err.status = 400;
              throw err;
            }
          }

          // Close only the SENDING foster's open placement(s) — never the receiving one.
          await tx.placement.updateMany({
            where: {
              kittenId: id,
              dischargeDate: null,
              fosterId: { not: nextFosterId },
            },
            data: {
              dischargeDate: new Date(),
              dischargeType: 'Transferred',
            },
          });

          const openForFoster = await tx.placement.findFirst({
            where: { kittenId: id, fosterId: nextFosterId, dischargeDate: null },
          });
          if (!openForFoster) {
            await tx.placement.create({
              data: {
                kittenId: id,
                fosterId: nextFosterId,
                intakeDate: new Date(),
              },
            });
          }
        } else {
          // Unassign: close open placements and clear currentFosterId.
          await tx.placement.updateMany({
            where: { kittenId: id, dischargeDate: null },
            data: {
              dischargeDate: new Date(),
              dischargeType: 'Discharged',
            },
          });
        }
      }

      if (becomingTerminal) {
        await tx.placement.updateMany({
          where: { kittenId: id, dischargeDate: null },
          data: {
            dischargeDate: new Date(),
            dischargeType: TERMINAL_DISCHARGE_TYPE[nextStatus] || nextStatus,
          },
        });
      }

      try {
        return await tx.kitten.update({
          where: { id },
          data,
          include: kittenIncludes,
        });
      } catch (error) {
        if (!isUnknownPublishTargetsError(error) || data.publishTargets === undefined) {
          throw error;
        }
        return tx.kitten.update({
          where: { id },
          data: withLegacyWebsiteFlag(data, data.publishTargets),
          include: kittenIncludes,
        });
      }
    });

    if (previousPartnerId && previousPartnerId !== data.bondedWithKittenId) {
      await prisma.kitten.updateMany({
        where: { id: previousPartnerId, bondedWithKittenId: id },
        data: { bondedWithKittenId: null, isBondedPair: false, bondedWithName: '' },
      });
    }

    if (data.bondedWithKittenId) {
      await prisma.kitten.update({
        where: { id: data.bondedWithKittenId },
        data: {
          isBondedPair: true,
          bondedWithKittenId: id,
          bondedWithName: kitten.name,
        },
      });
    }

    // Bust caches — publish targets or status may have changed
    invalidateCacheByPrefix('public-kittens');
    invalidateCacheByPrefix('public-stats');
    invalidateCacheByPrefix('dashboard-metrics');

    res.json(serializeKittenForDetail(kitten));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

export async function deleteKitten(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Valid kitten id is required' });
    }

    const existing = await prisma.kitten.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    await prisma.kitten.delete({ where: { id } });

    // Bust caches — kitten removed from public list
    invalidateCacheByPrefix('public-kittens');
    invalidateCacheByPrefix('public-stats');
    invalidateCacheByPrefix('dashboard-metrics');

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Kitten cannot be deleted because related records still reference it' });
    }
    next(error);
  }
}

export async function getDashboardStats(_req, res, next) {
  try {
    const cached = getCachedResponse('dashboard-stats', DASHBOARD_STATS_TTL_MS);
    if (cached) {
      return res.json(cached);
    }

    // Timezone fix: derive "this year" from the Pacific calendar year, not
    // the server process's local/UTC year (avoids an off-by-a-few-hours
    // boundary error right around New Year's).
    const pacificYear = toPacificDateString(new Date()).slice(0, 4);
    const yearStart = parsePacificDateOnly(`${pacificYear}-01-01`);
    const [
      activeKittens,
      availableForAdoption,
      pendingAdoptions,
      activeFosters,
      adoptionsThisYear,
      insights,
    ] = await Promise.all([
      prisma.kitten.count({
        where: { status: { in: ['In Foster Care', 'Medical Hold'] } },
      }),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      prisma.application.count({ where: { status: { in: ['New', 'Under Review'] } } }),
      prisma.foster.count({ where: { currentKittens: { some: {} } } }),
      prisma.kitten.count({
        where: { status: 'Adopted', createdAt: { gte: yearStart } },
      }),
      buildDashboardInsights(prisma),
    ]);

    const payload = {
      activeKittens,
      availableForAdoption,
      pendingAdoptions,
      activeFosters,
      adoptionsThisYear,
      alerts: insights.alerts,
      medicalConcerns: insights.medicalConcerns,
    };

    setCachedResponse('dashboard-stats', payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}
