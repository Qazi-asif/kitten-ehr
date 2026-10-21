import prisma from '../lib/prisma.js';
import { kittenOwnerWhere, mergeKittenWhere } from '../utils/kittenScope.js';
import { formatZodError, KITTEN_STATUSES, updateKittenSchema } from '../validations/kittenValidation.js';
import { parsePacificDateOnly } from '../utils/pacificDate.js';
import { enqueueSyndication } from '../services/syndicationService.js';
import { invalidateCacheByPrefix } from '../utils/responseCache.js';

const LIST_SELECT = {
  id: true,
  externalId: true,
  name: true,
  dateOfBirth: true,
  intakeDate: true,
  microchipNumber: true,
  sex: true,
  breed: true,
  color: true,
  coatPattern: true,
  fivFelvStatus: true,
  status: true,
  fixedStatus: true,
  isActive: true,
  createdByUserId: true,
  vaccines: {
    orderBy: { dateGiven: 'desc' },
    select: { id: true, type: true, dateGiven: true, nextDueDate: true },
  },
  weightLogs: {
    orderBy: { date: 'desc' },
    take: 1,
    select: { id: true, weightGrams: true, date: true },
  },
};

function latestVaccine(vaccines, fragment) {
  return vaccines.find((vaccine) => String(vaccine.type || '').toLowerCase().includes(fragment)) || null;
}

function serializeRow(kitten) {
  const fvrcp = latestVaccine(kitten.vaccines, 'fvrcp');
  const rabies = latestVaccine(kitten.vaccines, 'rabies');
  return {
    id: kitten.id,
    externalId: kitten.externalId,
    name: kitten.name,
    dateOfBirth: kitten.dateOfBirth,
    intakeDate: kitten.intakeDate,
    vaccines: fvrcp?.dateGiven || null,
    rabies: rabies?.dateGiven || null,
    fixedStatus: kitten.fixedStatus,
    microchipNumber: kitten.microchipNumber,
    gender: kitten.sex,
    breed: kitten.breed,
    color: kitten.color,
    coatPattern: kitten.coatPattern,
    fivFelvStatus: kitten.fivFelvStatus,
    status: kitten.status,
    weight: kitten.weightLogs[0]?.weightGrams || null,
  };
}

async function upsertVaccine(kittenId, type, dateValue, db = prisma) {
  const dateGiven = parsePacificDateOnly(String(dateValue).slice(0, 10));
  if (!dateGiven) {
    const error = new Error(`Invalid date for ${type}`);
    error.status = 400;
    throw error;
  }
  const existing = await db.vaccine.findFirst({
    where: { kittenId, type: { contains: type, mode: 'insensitive' } },
    orderBy: { dateGiven: 'desc' },
  });
  if (existing) {
    return db.vaccine.update({
      where: { id: existing.id },
      data: { dateGiven, type },
    });
  }
  return db.vaccine.create({
    data: { kittenId, type, dateGiven },
  });
}

export async function getSpreadsheet(req, res, next) {
  try {
    const where = mergeKittenWhere({ isActive: true }, kittenOwnerWhere(req));
    const kittens = await prisma.kitten.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 500,
      select: LIST_SELECT,
    });
    res.json({ rows: kittens.map(serializeRow) });
  } catch (error) {
    next(error);
  }
}

export async function patchSpreadsheetCell(req, res, next) {
  try {
    const id = Number.parseInt(req.body?.id, 10);
    const field = String(req.body?.field || '');
    const value = req.body?.value;
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Valid kitten id is required' });
    }

    const existing = await prisma.kitten.findFirst({
      where: mergeKittenWhere({ id }, kittenOwnerWhere(req)),
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Kitten not found' });

    const allowed = new Set([
      'name', 'dateOfBirth', 'intakeDate', 'vaccines', 'rabies', 'fixedStatus',
      'microchipNumber', 'gender', 'breed', 'color', 'coatPattern', 'fivFelvStatus',
      'status', 'weight',
    ]);
    if (!allowed.has(field)) {
      return res.status(400).json({ error: `Field ${field} is not bulk-editable` });
    }

    await prisma.$transaction(async (tx) => {
      if (field === 'vaccines' || field === 'rabies') {
        if (value) await upsertVaccine(id, field === 'rabies' ? 'Rabies' : 'FVRCP', value, tx);
      } else if (field === 'weight') {
        const grams = Number(value);
        if (!Number.isFinite(grams) || grams <= 0) {
          const error = new Error('Weight must be a positive number of grams');
          error.status = 400;
          throw error;
        }
        await tx.weightLog.create({
          data: {
            kittenId: id,
            date: new Date(),
            weightGrams: grams,
            weightOz: grams / 28.3495,
            loggedBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
          },
        });
      } else {
        const payload = {};
        if (field === 'gender') payload.sex = value ?? '';
        else if (field === 'dateOfBirth' || field === 'intakeDate') {
          payload[field] = value ? String(value).slice(0, 10) : null;
        } else {
          payload[field] = value;
        }
        const parsed = updateKittenSchema.safeParse(payload);
        if (!parsed.success) {
          const error = new Error(formatZodError(parsed.error));
          error.status = 400;
          throw error;
        }
        if (parsed.data.status && !KITTEN_STATUSES.includes(parsed.data.status)) {
          const error = new Error('Invalid status');
          error.status = 400;
          throw error;
        }
        await tx.kitten.update({ where: { id }, data: parsed.data });
      }

      await enqueueSyndication('kitten.changed', id, tx);
    });
    invalidateCacheByPrefix('dashboard-metrics');
    invalidateCacheByPrefix('public-kittens');

    const kitten = await prisma.kitten.findUnique({ where: { id }, select: LIST_SELECT });
    res.json({ row: serializeRow(kitten) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}
