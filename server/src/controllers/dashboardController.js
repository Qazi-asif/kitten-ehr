import prisma from '../lib/prisma.js';
import { buildDashboardInsights } from '../services/dashboardInsights.js';
import { stripInlineDataUrl } from '../utils/kittenSerialization.js';
import { getCachedResponse, setCachedResponse } from '../utils/responseCache.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ALERT_LIMIT = 25;
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
    id: record.id,
    title: `${record.type} Vaccine Due`,
    kittenId: record.kittenId,
    kittenName: record.kitten?.name ?? 'Unknown',
    dueDate: record.nextDueDate,
    urgency,
  };
}

function mapMedicationAlert(record) {
  return {
    id: record.id,
    title: `${record.name} Medication Ending`,
    kittenId: record.kittenId,
    kittenName: record.kitten?.name ?? 'Unknown',
    dueDate: record.endDate,
    urgency: 'dueSoon',
  };
}

function mapVetVisitAlert(record) {
  const visitLabel = record.reason?.trim() || record.apptType?.trim() || 'Vet Visit';
  return {
    id: record.id,
    title: `${visitLabel}`,
    kittenId: record.kittenId,
    kittenName: record.kitten?.name ?? 'Unknown',
    dueDate: record.date,
    urgency: 'dueSoon',
  };
}

function mapProtocolFollowUp(dose) {
  const protocolName = dose.activeProtocol?.protocol?.name ?? 'Protocol';
  return {
    id: dose.id,
    title: `${protocolName} Protocol Follow-up`,
    kittenId: dose.activeProtocol?.kittenId ?? dose.activeProtocol?.kitten?.id,
    kittenName: dose.activeProtocol?.kitten?.name ?? 'Unknown',
    dueDate: dose.scheduledDate,
    urgency: 'dueSoon',
  };
}

export async function getDashboardAlerts() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * MS_PER_DAY);
  const in7Days = new Date(now.getTime() + 7 * MS_PER_DAY);
  const in14Days = new Date(now.getTime() + 14 * MS_PER_DAY);

  const [
    vaccinesDueSoon,
    vaccinesOverdue,
    medsEndingSoon,
    upcomingVetVisits,
    protocolFollowUps,
  ] = await Promise.all([
    prisma.vaccine.findMany({
      where: {
        nextDueDate: { not: null, gte: now, lte: in30Days },
      },
      distinct: ['kittenId', 'nextDueDate'],
      select: vaccineSelect,
      orderBy: { nextDueDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.vaccine.findMany({
      where: {
        nextDueDate: { not: null, lt: now },
      },
      distinct: ['kittenId', 'nextDueDate'],
      select: vaccineSelect,
      orderBy: { nextDueDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.medication.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE'] },
        endDate: { not: null, gte: now, lte: in7Days },
      },
      select: medicationSelect,
      orderBy: { endDate: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.vetAppointment.findMany({
      where: {
        date: { gte: now, lte: in14Days },
      },
      select: vetAppointmentSelect,
      orderBy: { date: 'asc' },
      take: ALERT_LIMIT,
    }),
    prisma.protocolDose.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: { gte: now, lte: in7Days },
        activeProtocol: { status: 'ACTIVE' },
      },
      distinct: ['activeProtocolId', 'scheduledDate'],
      select: {
        id: true,
        scheduledDate: true,
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
  ]);

  return {
    vaccinesDueSoon: vaccinesDueSoon.map((record) => mapVaccineAlert(record, 'dueSoon')),
    vaccinesOverdue: vaccinesOverdue.map((record) => mapVaccineAlert(record, 'overdue')),
    medsEndingSoon: medsEndingSoon.map(mapMedicationAlert),
    upcomingVetVisits: upcomingVetVisits.map(mapVetVisitAlert),
    protocolFollowUps: protocolFollowUps.map(mapProtocolFollowUp),
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
      activeProtocols,
      alerts,
      insights,
      statusGroups,
      recentIntakes,
      recentAdoptions,
      pendingApplications,
      upcomingEvents,
    ] = await Promise.all([
      prisma.kitten.count(),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      // "Total Fosters" on the dashboard means currently-active fosters, not
      // every foster ever created — Foster.isActive tracks that directly.
      prisma.foster.count({ where: { isActive: true } }),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.kitten.count({ where: { intakeSource: { contains: 'Euthanasia' } } }),
      prisma.activeProtocol.count(),
      getDashboardAlerts(),
      buildDashboardInsights(prisma),
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
        where: { status: { in: ['New', 'Under Review'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          status: true,
          kittenOfInterest: true,
          formData: true,
          createdAt: true,
        },
      }),
      // Next 5 events published to the public website - same isPublic/status
      // filter getPublicEventBySlug uses for what counts as "live" on the site.
      prisma.event.findMany({
        where: {
          isPublic: true,
          status: 'PUBLISHED',
          date: { gte: new Date() },
        },
        orderBy: { date: 'asc' },
        take: 5,
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

    const payload = {
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      activeProtocols,
      medicalConcerns: insights.medicalConcerns,
      // Avoid key `alerts` — `...alerts` below is getDashboardAlerts() reminder lists.
      summaryAlerts: insights.alerts,
      statusCounts,
      recentIntakes: recentIntakes.map(serializeDashboardKitten),
      recentAdoptions: recentAdoptions.map(serializeDashboardKitten),
      pendingApplications,
      upcomingEvents,
      ...alerts,
    };

    setCachedResponse('dashboard-metrics', payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}
