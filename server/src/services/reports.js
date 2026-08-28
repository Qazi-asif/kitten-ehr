/**
 * CR-102: defined, on-demand reports.
 *
 * Each report answers one question and returns the same shape:
 *   { summary: [{label, value, hint?}], columns: [...], rows: [[...]] }
 * so the UI, the CSV exporter and any future consumer all read it identically.
 *
 * Deliberately excluded per the CR: sponsorship and adoption-fee/financial
 * data, which the rescue does not track here.
 */
import {
  parsePacificDateOnly,
  endOfPacificDayUtc,
  startOfPacificTodayUtc,
  addPacificDays,
  toPacificDateString,
} from '../utils/pacificDate.js';

/** Terminal statuses, i.e. the cat has left our care. */
const OUTCOME_STATUSES = ['Adopted', 'Transferred', 'Deceased', 'Released'];
/** Outcomes counted as a life saved, for the save-rate denominator. */
const LIVE_OUTCOME_STATUSES = ['Adopted', 'Transferred', 'Released'];

/**
 * Normalizes free-text `intakeSource` plus the `isTnr`/`isColony` flags into the
 * four buckets the board and grant reports ask for. Source is free text, so it
 * is matched on substrings; the boolean flags win when set.
 */
export function intakeSourceBucket(kitten) {
  const raw = (kitten.intakeSource || '').toLowerCase();
  if (/euth|e-list|elist|kill list/.test(raw)) return 'Euthanasia List';
  if (kitten.isTnr || /\btnr\b|trap.?neuter/.test(raw)) return 'TNR';
  if (kitten.isColony || /colony/.test(raw)) return 'Colony';
  return 'Other';
}

const INTAKE_BUCKETS = ['Euthanasia List', 'TNR', 'Colony', 'Other'];

export function resolveDateRange(query = {}) {
  const endDate = query.endDate
    ? endOfPacificDayUtc(parsePacificDateOnly(query.endDate))
    : endOfPacificDayUtc(startOfPacificTodayUtc());
  const startDate = query.startDate
    ? parsePacificDateOnly(query.startDate)
    : addPacificDays(startOfPacificTodayUtc(), -365);
  return { startDate, endDate };
}

function daysBetween(from, to) {
  if (!from) return null;
  const end = to ? new Date(to) : new Date();
  const diff = end.getTime() - new Date(from).getTime();
  return diff < 0 ? 0 : Math.round(diff / 86400000);
}

function ageInWeeks(dateOfBirth, at) {
  if (!dateOfBirth) return null;
  const days = daysBetween(dateOfBirth, at);
  return days == null ? null : Math.floor(days / 7);
}

/** Age-at-intake buckets in weeks, matching how the rescue talks about cats. */
function ageBucket(weeks) {
  if (weeks == null) return 'Unknown';
  if (weeks < 4) return '0–3 weeks (neonate)';
  if (weeks < 8) return '4–7 weeks';
  if (weeks < 12) return '8–11 weeks';
  if (weeks < 24) return '12–23 weeks';
  if (weeks < 52) return '24–51 weeks';
  return '1 year or older';
}

function percent(numerator, denominator) {
  if (!denominator) return '—';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

const d = (value) => (value ? toPacificDateString(value) : '');

// ---------------------------------------------------------------------------

async function intakeOutcomeSummary(prisma, { startDate, endDate }) {
  const kittens = await prisma.kitten.findMany({
    where: { intakeDate: { gte: startDate, lte: endDate } },
    select: {
      id: true, status: true, intakeSource: true, isTnr: true, isColony: true, intakeDate: true,
    },
  });

  const byBucket = new Map(INTAKE_BUCKETS.map((bucket) => [bucket, {
    bucket, total: 0, adopted: 0, transferred: 0, deceased: 0, released: 0, inCare: 0,
  }]));

  for (const kitten of kittens) {
    const row = byBucket.get(intakeSourceBucket(kitten));
    row.total += 1;
    switch (kitten.status) {
      case 'Adopted': row.adopted += 1; break;
      case 'Transferred': row.transferred += 1; break;
      case 'Deceased': row.deceased += 1; break;
      case 'Released': row.released += 1; break;
      default: row.inCare += 1;
    }
  }

  const rows = [...byBucket.values()].map((row) => {
    const outcomes = row.adopted + row.transferred + row.deceased + row.released;
    const live = row.adopted + row.transferred + row.released;
    return [
      row.bucket, row.total, row.adopted, row.transferred, row.deceased,
      row.released, row.inCare, percent(live, outcomes),
    ];
  });

  const totals = [...byBucket.values()].reduce((acc, row) => ({
    total: acc.total + row.total,
    adopted: acc.adopted + row.adopted,
    transferred: acc.transferred + row.transferred,
    deceased: acc.deceased + row.deceased,
    released: acc.released + row.released,
    inCare: acc.inCare + row.inCare,
  }), { total: 0, adopted: 0, transferred: 0, deceased: 0, released: 0, inCare: 0 });

  const allOutcomes = totals.adopted + totals.transferred + totals.deceased + totals.released;
  const allLive = totals.adopted + totals.transferred + totals.released;

  rows.push([
    'TOTAL', totals.total, totals.adopted, totals.transferred, totals.deceased,
    totals.released, totals.inCare, percent(allLive, allOutcomes),
  ]);

  return {
    summary: [
      { label: 'Total intake', value: totals.total },
      { label: 'Adopted', value: totals.adopted },
      { label: 'Transferred', value: totals.transferred },
      { label: 'Released', value: totals.released },
      { label: 'Deceased', value: totals.deceased },
      { label: 'Still in care', value: totals.inCare },
      {
        label: 'Save rate',
        value: percent(allLive, allOutcomes),
        hint: 'Live outcomes (adopted, transferred, released) divided by all completed outcomes. Cats still in care are excluded.',
      },
    ],
    columns: [
      'Intake Source', 'Total Intake', 'Adopted', 'Transferred', 'Deceased',
      'Released', 'Still in Care', 'Save Rate',
    ],
    rows,
  };
}

async function outcomesByIntakeSource(prisma, { startDate, endDate }) {
  const kittens = await prisma.kitten.findMany({
    where: { intakeDate: { gte: startDate, lte: endDate } },
    orderBy: [{ intakeDate: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      status: true,
      intakeSource: true,
      isTnr: true,
      isColony: true,
      intakeDate: true,
      outcomeDate: true,
      outcomeDetail: true,
    },
  });

  const rows = kittens.map((kitten) => {
    const isOutcome = OUTCOME_STATUSES.includes(kitten.status);
    const lengthOfStay = daysBetween(kitten.intakeDate, isOutcome ? kitten.outcomeDate : null);
    return [
      kitten.id,
      kitten.name,
      intakeSourceBucket(kitten),
      kitten.intakeSource || '',
      d(kitten.intakeDate),
      kitten.status,
      d(kitten.outcomeDate),
      kitten.outcomeDetail || '',
      lengthOfStay == null ? '' : lengthOfStay,
      isOutcome ? 'Completed' : 'Still in care',
    ];
  });

  const withStay = rows.map((r) => r[8]).filter((v) => typeof v === 'number');
  const avgStay = withStay.length
    ? Math.round(withStay.reduce((a, b) => a + b, 0) / withStay.length)
    : 0;

  return {
    summary: [
      { label: 'Cats in range', value: rows.length },
      { label: 'Completed outcomes', value: rows.filter((r) => r[9] === 'Completed').length },
      { label: 'Still in care', value: rows.filter((r) => r[9] === 'Still in care').length },
      { label: 'Average length of stay', value: `${avgStay} days`, hint: 'Across cats with a completed outcome.' },
    ],
    columns: [
      'ID', 'Name', 'Intake Source', 'Intake Source (raw)', 'Intake Date', 'Outcome',
      'Outcome Date', 'Outcome Detail', 'Length of Stay (days)', 'Case Status',
    ],
    rows,
  };
}

async function spayNeuterStatus(prisma, { startDate, endDate }) {
  const kittens = await prisma.kitten.findMany({
    where: { intakeDate: { gte: startDate, lte: endDate } },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      status: true,
      sex: true,
      fixedStatus: true,
      dateOfBirth: true,
      intakeDate: true,
    },
  });

  const normalize = (value) => {
    const raw = (value || '').trim();
    if (!raw) return 'Unknown';
    if (/spay|neuter|fixed/i.test(raw)) return 'Spayed/Neutered';
    if (/intact/i.test(raw)) return 'Intact';
    return 'Unknown';
  };

  const counts = { 'Spayed/Neutered': 0, Intact: 0, Unknown: 0 };
  const rows = kittens.map((kitten) => {
    const status = normalize(kitten.fixedStatus);
    counts[status] += 1;
    return [
      kitten.id,
      kitten.name,
      kitten.sex || '',
      status,
      kitten.fixedStatus || '',
      kitten.status,
      d(kitten.dateOfBirth),
      d(kitten.intakeDate),
    ];
  });

  return {
    summary: [
      { label: 'Spayed/Neutered', value: counts['Spayed/Neutered'] },
      { label: 'Intact', value: counts.Intact },
      { label: 'Unknown', value: counts.Unknown },
      { label: 'Total', value: rows.length },
      {
        label: 'Percent fixed',
        value: percent(counts['Spayed/Neutered'], rows.length),
      },
    ],
    // "Date fixed" is not stored on Kitten — there is no such column in the
    // schema — so the raw status text is shown instead of an empty column.
    columns: ['ID', 'Name', 'Sex', 'Fixed Status', 'Recorded Value', 'Cat Status', 'Date of Birth', 'Intake Date'],
    rows,
  };
}

async function vaccineReport(prisma, { startDate, endDate }, options = {}) {
  const where = { dateGiven: { gte: startDate, lte: endDate } };
  if (options.vaccineType) {
    where.type = { contains: options.vaccineType, mode: 'insensitive' };
  }

  const vaccines = await prisma.vaccine.findMany({
    where,
    orderBy: [{ dateGiven: 'desc' }],
    include: { kitten: { select: { id: true, name: true, status: true } } },
  });

  const byType = new Map();
  for (const vaccine of vaccines) {
    const key = vaccine.type || 'Unspecified';
    byType.set(key, (byType.get(key) || 0) + 1);
  }

  const rows = vaccines.map((vaccine) => [
    vaccine.kitten?.id ?? '',
    vaccine.kitten?.name ?? '',
    vaccine.type,
    d(vaccine.dateGiven),
    d(vaccine.nextDueDate),
    vaccine.lotNumber || '',
    vaccine.manufacturer || '',
    vaccine.administeredBy || '',
  ]);

  const summary = [
    { label: 'Doses given', value: vaccines.length },
    { label: 'Cats vaccinated', value: new Set(vaccines.map((v) => v.kittenId)).size },
    ...[...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ label: type, value: count })),
  ];

  return {
    summary,
    columns: ['Cat ID', 'Cat Name', 'Vaccine', 'Date Given', 'Next Due', 'Lot #', 'Manufacturer', 'Administered By'],
    rows,
    filters: { vaccineType: options.vaccineType || '' },
  };
}

async function lengthOfStayFoster(prisma, { startDate, endDate }) {
  // Placement.intakeDate is when the cat went to that foster (not the cat's
  // rescue intake date, which lives on Kitten).
  const placements = await prisma.placement.findMany({
    where: { intakeDate: { gte: startDate, lte: endDate } },
    orderBy: [{ intakeDate: 'desc' }],
    include: {
      foster: { select: { id: true, name: true } },
      kitten: { select: { id: true, name: true, status: true } },
    },
  });

  const rows = placements.map((placement) => {
    const days = daysBetween(placement.intakeDate, placement.dischargeDate);
    return [
      placement.foster?.name || 'Unassigned',
      placement.kitten?.name || '',
      placement.kitten?.id ?? '',
      d(placement.intakeDate),
      d(placement.dischargeDate),
      days == null ? '' : days,
      placement.dischargeType || (placement.dischargeDate ? 'Completed' : 'Ongoing'),
    ];
  });

  const byFoster = new Map();
  for (const placement of placements) {
    const name = placement.foster?.name || 'Unassigned';
    if (!byFoster.has(name)) byFoster.set(name, { cats: new Set(), days: [] });
    const entry = byFoster.get(name);
    if (placement.kitten?.id) entry.cats.add(placement.kitten.id);
    const days = daysBetween(placement.intakeDate, placement.dischargeDate);
    if (days != null) entry.days.push(days);
  }

  const allDays = rows.map((r) => r[5]).filter((v) => typeof v === 'number');
  const avg = allDays.length ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length) : 0;

  const summary = [
    { label: 'Placements', value: rows.length },
    { label: 'Fosters involved', value: byFoster.size },
    { label: 'Ongoing placements', value: placements.filter((p) => !p.dischargeDate).length },
    { label: 'Average stay', value: `${avg} days` },
    {
      label: 'Longest stay',
      value: allDays.length ? `${Math.max(...allDays)} days` : '—',
    },
  ];

  return {
    summary,
    columns: ['Foster', 'Cat', 'Cat ID', 'Placement Date', 'Discharge Date', 'Days in Placement', 'Placement Status'],
    rows,
  };
}

async function ageAtIntake(prisma, { startDate, endDate }) {
  const kittens = await prisma.kitten.findMany({
    where: { intakeDate: { gte: startDate, lte: endDate } },
    orderBy: [{ intakeDate: 'desc' }],
    select: {
      id: true, name: true, dateOfBirth: true, intakeDate: true, status: true,
      intakeSource: true, isTnr: true, isColony: true,
    },
  });

  const buckets = new Map();
  const rows = kittens.map((kitten) => {
    const weeks = ageInWeeks(kitten.dateOfBirth, kitten.intakeDate);
    const bucket = ageBucket(weeks);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    return [
      kitten.id,
      kitten.name,
      d(kitten.dateOfBirth),
      d(kitten.intakeDate),
      weeks == null ? '' : weeks,
      bucket,
      intakeSourceBucket(kitten),
      kitten.status,
    ];
  });

  const known = rows.map((r) => r[4]).filter((v) => typeof v === 'number');
  const median = known.length
    ? [...known].sort((a, b) => a - b)[Math.floor(known.length / 2)]
    : null;

  const ORDER = [
    '0–3 weeks (neonate)', '4–7 weeks', '8–11 weeks', '12–23 weeks',
    '24–51 weeks', '1 year or older', 'Unknown',
  ];

  return {
    summary: [
      { label: 'Cats in range', value: rows.length },
      { label: 'Median age at intake', value: median == null ? '—' : `${median} weeks` },
      ...ORDER.filter((bucket) => buckets.has(bucket))
        .map((bucket) => ({ label: bucket, value: buckets.get(bucket) })),
    ],
    columns: ['ID', 'Name', 'Date of Birth', 'Intake Date', 'Age at Intake (weeks)', 'Age Bucket', 'Intake Source', 'Status'],
    rows,
  };
}

async function fullExport(prisma, { startDate, endDate }) {
  const kittens = await prisma.kitten.findMany({
    orderBy: { name: 'asc' },
    include: {
      currentFoster: { select: { name: true } },
      litter: { select: { name: true } },
    },
  });

  const rows = kittens.map((kitten) => [
    kitten.id,
    kitten.name,
    kitten.status,
    kitten.breed,
    // CR-102: coat color was missing from the raw export.
    kitten.color || '',
    kitten.sex,
    kitten.fixedStatus,
    kitten.fivFelvStatus || '',
    kitten.microchipNumber || '',
    d(kitten.dateOfBirth),
    d(kitten.intakeDate),
    kitten.intakeSource || '',
    intakeSourceBucket(kitten),
    d(kitten.outcomeDate),
    kitten.outcomeDetail || '',
    kitten.litter?.name || '',
    kitten.currentFoster?.name || '',
    kitten.specialNeeds || '',
  ]);

  return {
    summary: [{ label: 'Cats exported', value: rows.length, hint: 'The full export ignores the date range by design.' }],
    columns: [
      'ID', 'Name', 'Status', 'Breed', 'Coat Color', 'Sex', 'Fixed Status', 'FIV/FeLV',
      'Microchip', 'Date of Birth', 'Intake Date', 'Intake Source (raw)', 'Intake Source',
      'Outcome Date', 'Outcome Detail', 'Litter', 'Current Foster', 'Special Needs',
    ],
    rows,
    ignoresDateRange: true,
  };
}

export const REPORTS = [
  {
    key: 'intake-outcome-summary',
    label: 'Intake & Outcome Summary',
    description: 'Counts and save rates by intake source. The primary annual, grant and board report.',
    run: intakeOutcomeSummary,
  },
  {
    key: 'outcomes-by-intake-source',
    label: 'Outcomes by Intake Source (detail)',
    description: 'Row-level detail behind the summary: each cat with intake source, dates, outcome and length of stay.',
    run: outcomesByIntakeSource,
  },
  {
    key: 'spay-neuter-status',
    label: 'Spay/Neuter Status',
    description: 'Who is fixed: cats grouped by Spayed/Neutered, Intact or Unknown.',
    run: spayNeuterStatus,
  },
  {
    key: 'vaccine-report',
    label: 'Vaccine Report',
    description: 'Which cats received which vaccines and when. Filterable by vaccine type.',
    supportsVaccineType: true,
    run: vaccineReport,
  },
  {
    key: 'length-of-stay-foster',
    label: 'Length of Stay / Foster Analysis',
    description: 'Foster assignments with duration, for capacity planning.',
    run: lengthOfStayFoster,
  },
  {
    key: 'age-at-intake',
    label: 'Age at Intake',
    description: 'Distribution of ages at intake.',
    run: ageAtIntake,
  },
  {
    key: 'full-export',
    label: 'Full Cat Export (raw)',
    description: 'Every cat, all columns, including coat color. Ignores the date range.',
    run: fullExport,
  },
];

export function getReport(key) {
  return REPORTS.find((report) => report.key === key) || null;
}

export function listReports() {
  return REPORTS.map(({ key, label, description, supportsVaccineType }) => ({
    key,
    label,
    description,
    supportsVaccineType: Boolean(supportsVaccineType),
  }));
}
