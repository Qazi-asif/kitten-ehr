import prisma from '../lib/prisma.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    }),
    prisma.vaccine.findMany({
      where: {
        nextDueDate: { not: null, lt: now },
      },
      distinct: ['kittenId', 'nextDueDate'],
      select: vaccineSelect,
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.medication.findMany({
      where: {
        status: { in: ['Active', 'ACTIVE'] },
        endDate: { not: null, gte: now, lte: in7Days },
      },
      select: medicationSelect,
      orderBy: { endDate: 'asc' },
    }),
    prisma.vetAppointment.findMany({
      where: {
        date: { gte: now, lte: in14Days },
      },
      select: vetAppointmentSelect,
      orderBy: { date: 'asc' },
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
    const [
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      activeProtocols,
      alerts,
    ] = await Promise.all([
      prisma.kitten.count(),
      prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
      prisma.foster.count(),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.kitten.count({ where: { intakeSource: { contains: 'Euthanasia' } } }),
      prisma.activeProtocol.count(),
      getDashboardAlerts(),
    ]);

    res.json({
      totalKittens,
      availableKittens,
      activeFosters,
      totalAdopted,
      euthanasiaPulls,
      activeProtocols,
      ...alerts,
    });
  } catch (error) {
    next(error);
  }
}
