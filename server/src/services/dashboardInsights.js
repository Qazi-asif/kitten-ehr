import { evaluateKittenFlags } from './medicalAutomation.js';
import { formatPacificDisplay } from '../utils/pacificDate.js';

const ACTIVE_KITTEN_STATUSES = ['In Foster Care', 'Available for Adoption', 'Medical Hold'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function groupByKittenId(records) {
  const map = new Map();
  for (const record of records) {
    const bucket = map.get(record.kittenId) ?? [];
    bucket.push(record);
    map.set(record.kittenId, bucket);
  }
  return map;
}

export async function buildDashboardInsights(prisma) {
  const now = new Date();
  const medicationEndingBy = new Date(now.getTime() + 7 * MS_PER_DAY);
  const activeKittenFilter = { status: { in: ACTIVE_KITTEN_STATUSES } };

  const [
    activeKittens,
    overdueVaccineKittenIds,
    endingMedications,
    availableForAdoption,
    pendingApplications,
    nextEvent,
    activeMedications,
  ] = await Promise.all([
    prisma.kitten.findMany({
      where: activeKittenFilter,
      select: { id: true, dateOfBirth: true, fixedStatus: true },
    }),
    prisma.vaccine.findMany({
      where: {
        nextDueDate: { lt: now },
        kitten: activeKittenFilter,
      },
      select: { kittenId: true },
      distinct: ['kittenId'],
    }),
    prisma.medication.findMany({
      where: {
        status: 'Active',
        endDate: { not: null, lte: medicationEndingBy, gte: now },
        kitten: activeKittenFilter,
      },
      select: { name: true, endDate: true },
      orderBy: { endDate: 'asc' },
      take: 3,
    }),
    prisma.kitten.count({ where: { status: 'Available for Adoption' } }),
    prisma.application.count({ where: { status: { in: ['New', 'Under Review'] } } }),
    prisma.event.findFirst({
      where: {
        isPublic: true,
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
      select: { title: true, date: true },
    }),
    prisma.medication.findMany({
      where: {
        status: 'Active',
        condition: { not: '' },
        kitten: activeKittenFilter,
      },
      select: { condition: true },
    }),
  ]);

  const kittenIds = activeKittens.map((kitten) => kitten.id);
  const [vaccines, weightLogs] = kittenIds.length
    ? await Promise.all([
        prisma.vaccine.findMany({
          where: { kittenId: { in: kittenIds } },
          select: { kittenId: true, type: true, dateGiven: true },
        }),
        prisma.weightLog.findMany({
          where: { kittenId: { in: kittenIds } },
          select: { kittenId: true, weightGrams: true, weightOz: true, date: true },
        }),
      ])
    : [[], []];

  const vaccinesByKitten = groupByKittenId(vaccines);
  const weightLogsByKitten = groupByKittenId(weightLogs);

  const vaccineFlagKittenIds = new Set();
  for (const kitten of activeKittens) {
    const flags = evaluateKittenFlags(
      kitten,
      vaccinesByKitten.get(kitten.id) ?? [],
      weightLogsByKitten.get(kitten.id) ?? [],
    );
    if (flags.some((flag) => flag.type === 'VACCINE')) {
      vaccineFlagKittenIds.add(kitten.id);
    }
  }

  const overdueVaccineKittens = new Set([
    ...overdueVaccineKittenIds.map((record) => record.kittenId),
    ...vaccineFlagKittenIds,
  ]);

  const concernCounts = new Map();
  for (const medication of activeMedications) {
    const label = medication.condition.trim();
    if (!label) continue;
    concernCounts.set(label, (concernCounts.get(label) ?? 0) + 1);
  }

  const medicalConcerns = [...concernCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  const alerts = [];

  if (overdueVaccineKittens.size > 0) {
    const count = overdueVaccineKittens.size;
    alerts.push({
      severity: 'error',
      text: `Vaccines overdue or due for ${count} kitten${count === 1 ? '' : 's'}`,
    });
  }

  if (endingMedications.length > 0) {
    const names = [...new Set(endingMedications.map((med) => med.name))].join(', ');
    alerts.push({
      severity: 'warning',
      text: `Medications ending soon — review ${names}`,
    });
  }

  if (availableForAdoption > 0) {
    alerts.push({
      severity: 'success',
      text: `${availableForAdoption} kitten${availableForAdoption === 1 ? '' : 's'} available for adoption`,
    });
  }

  if (pendingApplications > 0) {
    alerts.push({
      severity: 'info',
      text: `${pendingApplications} application${pendingApplications === 1 ? '' : 's'} awaiting review`,
    });
  }

  if (nextEvent) {
    // Format in Pacific explicitly — the server process's own timezone must
    // never leak into a date the org displays to Pacific-based staff.
    alerts.push({
      severity: 'info',
      text: `${nextEvent.title} scheduled ${formatPacificDisplay(nextEvent.date)}`,
    });
  }

  return { alerts, medicalConcerns };
}
