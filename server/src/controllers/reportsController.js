import prisma from '../lib/prisma.js';
import { TERMINAL_KITTEN_STATUSES } from '../validations/kittenValidation.js';
import { parsePacificDateOnly, endOfPacificDayUtc, startOfPacificTodayUtc, addPacificDays, toPacificDateString } from '../utils/pacificDate.js';

/** Default reporting window when no explicit range is provided: trailing 30 days (Pacific). */
function resolveDateRange(query) {
  const endDate = query.endDate ? endOfPacificDayUtc(parsePacificDateOnly(query.endDate)) : endOfPacificDayUtc(startOfPacificTodayUtc());
  const startDate = query.startDate
    ? parsePacificDateOnly(query.startDate)
    : addPacificDays(startOfPacificTodayUtc(), -30);
  return { startDate, endDate };
}

export async function getReportsSummary(req, res) {
  const { startDate, endDate } = resolveDateRange(req.query);

  const [kittensByStatusRaw, adoptionsInRange, activePlacements, applicationsByStatusRaw] = await Promise.all([
    prisma.kitten.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.kitten.count({
      where: { status: 'Adopted', outcomeDate: { gte: startDate, lte: endDate } },
    }),
    prisma.placement.count({ where: { dischargeDate: null } }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const kittensByStatus = kittensByStatusRaw
    .map((row) => ({ status: row.status, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const applicationsByStatus = applicationsByStatusRaw
    .map((row) => ({ status: row.status, count: row._count._all }))
    .sort((a, b) => b.count - a.count);

  const totalKittens = kittensByStatus.reduce((sum, row) => sum + row.count, 0);
  const activeKittens = kittensByStatus
    .filter((row) => !TERMINAL_KITTEN_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);

  res.json({
    range: { startDate: toPacificDateString(startDate), endDate: toPacificDateString(endDate) },
    totalKittens,
    activeKittens,
    kittensByStatus,
    adoptionsInRange,
    activePlacements,
    applicationsByStatus,
  });
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function exportKittensCsv(req, res) {
  const kittens = await prisma.kitten.findMany({
    orderBy: { name: 'asc' },
    include: { currentFoster: { select: { name: true } }, litter: { select: { name: true } } },
  });

  const headers = [
    'ID',
    'Name',
    'Status',
    'Breed',
    'Sex',
    'Fixed Status',
    'Date of Birth',
    'Intake Date',
    'Outcome Date',
    'Litter',
    'Current Foster',
  ];
  const rows = kittens.map((k) => [
    k.id,
    k.name,
    k.status,
    k.breed,
    k.sex,
    k.fixedStatus,
    toPacificDateString(k.dateOfBirth),
    toPacificDateString(k.intakeDate),
    toPacificDateString(k.outcomeDate),
    k.litter?.name || '',
    k.currentFoster?.name || '',
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kittens-${toPacificDateString(new Date())}.csv"`);
  res.send(csv);
}
