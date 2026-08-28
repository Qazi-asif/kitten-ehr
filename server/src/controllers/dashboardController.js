import prisma from '../lib/prisma.js';
import { buildDashboardInsights } from '../services/dashboardInsights.js';
import { stripInlineDataUrl } from '../utils/kittenSerialization.js';
import { getCachedResponse, setCachedResponse } from '../utils/responseCache.js';
import { startOfPacificTodayUtc, addPacificDays, endOfPacificDayUtc } from '../utils/pacificDate.js';
import {
  getReminderCategoryCounts,
  getReminderCategoryItems,
  REMINDER_CATEGORIES,
} from '../services/reminderCategories.js';

const ALERT_LIMIT = 25;
// Cats considered "active" for reminder purposes — excludes terminal outcomes
// (Adopted/Transferred/Deceased/Released) so past-tense records never surface
// as action items.
const ACTIVE_KITTEN_STATUSES = ['In Foster Care', 'Available for Adoption', 'Medical Hold', 'In Socialization'];
// CR-88: spay/neuter eligibility threshold.
const SPAY_NEUTER_WEIGHT_GRAMS = 907;
// Cache dashboard metrics for 60 seconds — keeps the DB quiet under repeated
// refreshes while still reflecting new data within a minute.
const DASHBOARD_METRICS_TTL_MS = 60 * 1000;

const dashboardKittenSelect = {
  id: true,
  name: true,
  status: true,
  breed: true,
  intakeDate: true,
  primaryPhotoUrl: true,
};

const vaccineSelect = {
  id: true,
  type: true,
  nextDueDate: true,
  kittenId: true,
  kitten: { select: { id: true, name: true } },
};

const medicationSelect = {
  id: true,
  name: true,
  endDate: true,
  kittenId: true,
  kitten: { select: { id: true, name: true } },
};

const vetAppointmentSelect = {
  id: true,
  date: true,
  reason: true,
  apptType: true,
  clinic: true,
  kittenId: true,
  kitten: { select: { id: true, name: true } },
};

function serializeDashboardKitten(kitten) {
  return {
    ...kitten,
    primaryPhotoUrl: stripInlineDataUrl(kitten.primaryPhotoUrl),
  };
}

function mapVaccineAlert(record, urgency) {
  return {
    id: `vaccine-${record.id}`,
    title: `${record.type} Vaccine Due`,
    kittenId: record.kittenId,
    kittenName: record.kitten?.name ?? 'Unknown',
    kittenIds: [record.kittenId],
    dueDate: record.nextDueDate,
    urgency,
  };
}

function mapMedicationAlert(record) {
  return {
    id: `med-${record.id}`,
    title: `${record.name} Medication Ending`,
    kittenId: record.kittenId,
    kittenName: record.kitten?.name ?? 'Unknown',
    kittenIds: [record.kittenId],
    dueDate: record.endDate,
    urgency: 'dueSoon',
  };
}

function mapVetVisitAlert(record) {
  const visitLabel = record.reason?.trim() || record.apptType?.trim() || 'Vet Visit';
  return {
    id: `vet-${record.id}`,
    title: `${visitLabel}`,
    kittenId: record.kittenId,
    kittenName: record.kitten?.name ?? 'Unknown',
    kittenIds: [record.kittenId],
    dueDate: record.date,
    urgency: 'dueSoon',
  };
}

function mapProtocolFollowUp(dose) {
  const protocolName = dose.activeProtocol?.protocol?.name ?? 'Protocol';
  const drugName = dose.protocolDrug?.drugName;
  const kittenId = dose.activeProtocol?.kittenId ?? dose.activeProtocol?.kitten?.id;
  return {
    id: `dose-${dose.id}`,
    title: drugName ? `${drugName} Dose (${protocolName})` : `${protocolName} Protocol Dose`,
    kittenId,
    kittenName: dose.activeProtocol?.kitten?.name ?? 'Unknown',
    kittenIds: kittenId ? [kittenId] : [],
    dueDate: dose.scheduledDate,
    urgency: 'dueSoon',
  };
}

function mapSpayNeuterAlert(kitten) {
  return {
    id: `spay-${kitten.id}`,
    title: 'Spay/Neuter Eligible (\u2265907g)',
    kittenId: kitten.id,
    kittenName: kitten.name,
    kittenIds: [kitten.id],
    dueDate: kitten.latestWeightDate,
    urgency: 'dueSoon',
  };
}

function mapCalendarAlert(event) {
  const kittens = (event.eventCats || []).map((ec) => ec.kitten).filter(Boolean);
  return {
    id: `event-${event.id}`,
    title: event.title,
    kittenId: kittens[0]?.id,
    kittenName: kittens.length === 1
      ? kittens[0].name
      : kittens.length > 1
        ? `${kittens.length} cats`
        : undefined,
    kittenIds: kittens.map((k) => k.id),
    dueDate: event.date,
    urgency: 'dueSoon',
  };
}

/** Latest WeightLog per kittenId, from a list ordered by date desc. */
function latestWeightByKitten(weightLogs) {
  const map = new Map();
  for (const log of weightLogs) {
    if (!map.has(log.kittenId)) map.set(log.kittenId, log);
  }
  return map;
}

function resolveWeightGrams(log) {
  if (!log) return null;
  if (log.weightGrams > 0) return log.weightGrams;
  if (log.weightOz > 0) return log.weightOz * 28.3495;
  return null;
}

// CR-87: rolling 7-day complete capture. Every window below is anchored to
// Pacific calendar-day boundaries (today's Pacific midnight through the end
// of Pacific day +7) rather than the current instant — using `now` as the
// lower bound previously excluded anything scheduled earlier "today" (e.g. a
// dose stored at Pacific midnight looks like it's already in the past for
// most of the day), which was the root cause of doses silently disappearing.
export async function getDashboardAlerts() {
  const todayStartUtc = startOfPacificTodayUtc();
  const windowEndUtc = endOfPacificDayUtc(addPacificDays(todayStartUtc, 7));

  const [
    vaccinesDueSoon,
    vaccinesOverdue,
    medsEndingSoon,
    upcomingVetVisits,
    protocolFollowUps,
    spayEligibleKittens,
    calendarReminderEvents,
  ] = await Promise.all([
    prisma.vaccine.findMany({
      where: {
        nextDueDate: { not: null, gte: todayStartUtc, lte: windowEndUtc },
        kitten: { status: { in: ACTIVE_KITTEN_STATUSES } },
      },
      distinct: ['kittenId', 'type'],
      select: vaccineSelect,
      orderBy: { nextDueDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.vaccine.findMany({
      where: {
        nextDueDate: { not: null, lt: todayStartUtc },
        kitten: { status: { in: ACTIVE_KITTEN_STATUSES } },
      },
      distinct: ['kittenId', 'type'],
      select: vaccineSelect,
      orderBy: { nextDueDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.medication.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE'] },
        endDate: { not: null, gte: todayStartUtc, lte: windowEndUtc },
        kitten: { status: { in: ACTIVE_KITTEN_STATUSES } },
      },
      select: medicationSelect,
      orderBy: { endDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.vetAppointment.findMany({
      where: {
        date: { gte: todayStartUtc, lte: windowEndUtc },
        kitten: { status: { in: ACTIVE_KITTEN_STATUSES } },
      },
      select: vetAppointmentSelect,
      orderBy: { date: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.protocolDose.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: { gte: todayStartUtc, lte: windowEndUtc },
        activeProtocol: { status: 'ACTIVE', kitten: { status: { in: ACTIVE_KITTEN_STATUSES } } },
      },
      // Distinct on drug + date (not just date) so multiple drugs due the
      // same day don't collapse into a single row and silently drop doses.
      distinct: ['activeProtocolId', 'protocolDrugId', 'scheduledDate'],
      select: {
        id: true,
        scheduledDate: true,
        protocolDrug: { select: { drugName: true } },
        activeProtocol: {
          select: {
            kittenId: true,
            kitten: { select: { id: true, name: true } },
            protocol: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    // CR-88: spay/neuter eligibility — active, not-yet-fixed kittens whose
    // latest weight is at/above the eligibility threshold.
    prisma.kitten.findMany({
      where: {
        status: { in: ACTIVE_KITTEN_STATUSES },
        fixedStatus: { not: 'Spayed/Neutered' },
      },
      select: { id: true, name: true },
    }),
    // CR-89: calendar events explicitly flagged to appear in reminders,
    // within the same rolling window, tagged to at least one kitten.
    prisma.event.findMany({
      where: {
        showInReminders: true,
        date: { gte: todayStartUtc, lte: windowEndUtc },
        eventCats: { some: {} },
      },
      select: {
        id: true,
        title: true,
        date: true,
        eventCats: { select: { kitten: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'asc' },
      take: ALERT_LIMIT,
    }),
  ]);

  let spayNeuterEligible = [];
  if (spayEligibleKittens.length > 0) {
    const weightLogs = await prisma.weightLog.findMany({
      where: { kittenId: { in: spayEligibleKittens.map((k) => k.id) } },
      orderBy: { date: 'desc' },
      select: { kittenId: true, weightGrams: true, weightOz: true, date: true },
    });
    const latestByKitten = latestWeightByKitten(weightLogs);
    spayNeuterEligible = spayEligibleKittens
      .map((kitten) => {
        const latest = latestByKitten.get(kitten.id);
        const grams = resolveWeightGrams(latest);
        if (grams == null || grams < SPAY_NEUTER_WEIGHT_GRAMS) return null;
        return mapSpayNeuterAlert({ ...kitten, latestWeightDate: latest.date });
      })
      .filter(Boolean)
      .slice(0, ALERT_LIMIT);
  }

  return {
    vaccinesDueSoon: vaccinesDueSoon.map((record) => mapVaccineAlert(record, 'dueSoon')),
    vaccinesOverdue: vaccinesOverdue.map((record) => mapVaccineAlert(record, 'overdue')),
    medsEndingSoon: medsEndingSoon.map(mapMedicationAlert),
    upcomingVetVisits: upcomingVetVisits.map(mapVetVisitAlert),
    protocolFollowUps: protocolFollowUps.map(mapProtocolFollowUp),
    spayNeuterEligible,
    calendarReminders: calendarReminderEvents.map(mapCalendarAlert),
  };
}

export async function getDashboardMetrics(_req, res, next) {
  try {
    // Serve from cache when available — avoids hammering the DB on every page load
    const cached = getCachedResponse('dashboard-metrics', DASHBOARD_METRICS_TTL_MS);
    if (cached) {
      return res.json(cached);
    }

    const [
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      tnrReleases,
      activeProtocols,
      alerts,
      insights,
      reminderCategories,
      statusGroups,
      recentIntakes,
      recentAdoptions,
      pendingApplications,
      applicationStatusGroups,
      upcomingEvents,
    ] = await Promise.all([
      prisma.kitten.count(),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      // "Total Fosters" on the dashboard means currently-active fosters, not
      // every foster ever created — Foster.isActive tracks that directly.
      prisma.foster.count({ where: { isActive: true } }),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.kitten.count({ where: { intakeSource: { contains: 'Euthanasia' } } }),
      prisma.kitten.count({
        where: {
          OR: [
            { isTnr: true },
            { status: 'Released' },
          ],
        },
      }),
      prisma.activeProtocol.count(),
      getDashboardAlerts(),
      buildDashboardInsights(prisma),
      getReminderCategoryCounts(prisma),
      prisma.kitten.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.kitten.findMany({
        orderBy: [{ intakeDate: 'desc' }, { id: 'desc' }],
        take: 4,
        select: dashboardKittenSelect,
      }),
      prisma.kitten.findMany({
        where: { status: 'Adopted' },
        orderBy: [{ intakeDate: 'desc' }, { id: 'desc' }],
        take: 4,
        select: dashboardKittenSelect,
      }),
      prisma.application.findMany({
        where: { status: { in: ['New', 'Under Review', 'Approved'] } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          type: true,
          status: true,
          kittenOfInterest: true,
          formData: true,
          createdAt: true,
        },
      }),
      prisma.application.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      // Month calendar + upcoming list: published website events from Pacific today.
      prisma.event.findMany({
        where: {
          isPublic: true,
          status: 'PUBLISHED',
          date: { gte: startOfPacificTodayUtc() },
        },
        orderBy: { date: 'asc' },
        take: 60,
        select: {
          id: true,
          title: true,
          slug: true,
          date: true,
          location: true,
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    );

    const applicationStatusCounts = Object.fromEntries(
      applicationStatusGroups.map((group) => [group.status, group._count._all]),
    );

    const payload = {
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      tnrReleases,
      activeProtocols,
      medicalConcerns: insights.medicalConcerns,
      // Avoid key `alerts` — `...alerts` below is getDashboardAlerts() reminder lists.
      summaryAlerts: insights.alerts,
      statusCounts,
      applicationStatusCounts,
      recentIntakes: recentIntakes.map(serializeDashboardKitten),
      recentAdoptions: recentAdoptions.map(serializeDashboardKitten),
      pendingApplications,
      upcomingEvents,
      // CR-97: one row per category with a count, so a large category (usually
      // spay/neuter) can no longer crowd the others out of the panel.
      reminderCategories,
      ...alerts,
    };

    setCachedResponse('dashboard-metrics', payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

/**
 * CR-100: the full reminders view — every category with every matching cat,
 * not the 25-per-category cap the dashboard panel uses.
 */
export async function getAllReminders(req, res, next) {
  try {
    const requested = typeof req.query.category === 'string' ? req.query.category : null;
    const categories = requested
      ? REMINDER_CATEGORIES.filter((category) => category.key === requested)
      : REMINDER_CATEGORIES;

    if (requested && categories.length === 0) {
      return res.status(400).json({ error: `Unknown reminder category: ${requested}` });
    }

    const results = await Promise.all(
      categories.map(async (category) => {
        const kittens = await getReminderCategoryItems(prisma, category.key);
        return {
          key: category.key,
          label: category.label,
          description: category.description,
          tone: category.tone,
          count: kittens.length,
          kittens,
        };
      }),
    );

    res.json({ categories: results });
  } catch (error) {
    next(error);
  }
}
