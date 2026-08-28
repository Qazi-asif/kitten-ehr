import prisma from '../lib/prisma.js';
import { TERMINAL_KITTEN_STATUSES } from '../validations/kittenValidation.js';
import { toPacificDateString } from '../utils/pacificDate.js';
import { buildCsv } from '../utils/csv.js';
import { getReport, listReports, resolveDateRange } from '../services/reports.js';

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

/** CR-102: the catalogue of defined reports, for the report picker. */
export async function getReportsCatalog(_req, res) {
  res.json({ reports: listReports() });
}

/**
 * CR-102: run one defined report. Returns JSON by default, or CSV when
 * `?format=csv`, so the on-screen view and the export are always the same data.
 */
export async function runReportHandler(req, res, next) {
  try {
    const report = getReport(req.params.reportKey);
    if (!report) {
      return res.status(404).json({ error: `Unknown report: ${req.params.reportKey}` });
    }

    const range = resolveDateRange(req.query);
    const options = { vaccineType: req.query.vaccineType || '' };
    const result = await report.run(prisma, range, options);

    const payload = {
      key: report.key,
      label: report.label,
      description: report.description,
      range: {
        startDate: toPacificDateString(range.startDate),
        endDate: toPacificDateString(range.endDate),
      },
      ...result,
    };

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const meta = [
        [report.label],
        result.ignoresDateRange
          ? ['All dates']
          : [`Range: ${payload.range.startDate} to ${payload.range.endDate}`],
        [],
        ['Summary'],
        ...result.summary.map((item) => [item.label, item.value]),
        [],
        ['Detail'],
      ];
      const csv = buildCsv([...meta, result.columns, ...result.rows]);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${report.key}-${toPacificDateString(new Date())}.csv"`,
      );
      return res.send(csv);
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
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

  const csv = buildCsv([headers, ...rows]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kittens-${toPacificDateString(new Date())}.csv"`);
  res.send(csv);
}
