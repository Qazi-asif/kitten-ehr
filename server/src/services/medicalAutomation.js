import { toPacificDateString } from '../utils/pacificDate.js';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
// CR-88: spay/neuter eligibility at/above 907g.
const SPAY_NEUTER_WEIGHT_GRAMS = 907;

// Anchors every calendar date to UTC midnight of its *Pacific* calendar day,
// independent of the server process's own OS/system timezone. Using local
// getters here (getFullYear/getMonth/getDate) previously bound the result to
// whatever timezone the Node process happened to run under — on a host
// configured for Pacific, that silently rolled Pacific-midnight-anchored
// UTC instants back onto the previous calendar day. Raw `YYYY-MM-DD` strings
// (no time/zone info) are parsed as a literal calendar date, never round-tripped
// through a timezone conversion.
function parseCalendarDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return new Date(Date.UTC(year, month, day));
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const ymd = toPacificDateString(date);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function getAgeInWeeks(dateOfBirth, asOf = new Date()) {
  const dob = parseCalendarDate(dateOfBirth);
  if (!dob) return null;
  const asOfDay = parseCalendarDate(asOf) || asOf;
  const ageMs = asOfDay.getTime() - dob.getTime();
  if (ageMs < 0) return 0;
  return ageMs / MS_PER_WEEK;
}

function getWeeksSince(date, asOf = new Date()) {
  if (!date) return null;
  const start = new Date(date);
  const elapsedMs = asOf.getTime() - start.getTime();
  if (elapsedMs < 0) return 0;
  return elapsedMs / MS_PER_WEEK;
}

function getLatestWeightGrams(weightLogs = []) {
  if (!weightLogs.length) return null;

  const sorted = [...weightLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latest = sorted[0];

  if (latest.weightGrams > 0) return latest.weightGrams;
  if (latest.weightOz > 0) return latest.weightOz * 28.3495;
  return null;
}

function vaccinesOfType(vaccines = [], matcher) {
  return vaccines.filter((vaccine) => matcher(String(vaccine.type || '').toUpperCase()));
}

function latestVaccine(vaccines) {
  if (!vaccines.length) return null;
  return [...vaccines].sort(
    (a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime(),
  )[0];
}

function earliestVaccine(vaccines) {
  if (!vaccines.length) return null;
  return [...vaccines].sort(
    (a, b) => new Date(a.dateGiven).getTime() - new Date(b.dateGiven).getTime(),
  )[0];
}

export function evaluateKittenFlags(kitten, vaccines = [], weightLogs = []) {
  const flags = [];
  const ageWeeks = getAgeInWeeks(kitten?.dateOfBirth);
  const latestWeightGrams = getLatestWeightGrams(weightLogs);

  if (
    latestWeightGrams != null
    && latestWeightGrams >= SPAY_NEUTER_WEIGHT_GRAMS
    && kitten?.fixedStatus !== 'Spayed/Neutered'
  ) {
    flags.push({ type: 'SPAY_NEUTER', label: 'Spay/Neuter Eligible' });
  }

  if (ageWeeks != null) {
    const fvrcps = vaccinesOfType(vaccines, (type) => type.includes('FVRCP'));
    const lastFvrcp = latestVaccine(fvrcps);

    if (ageWeeks >= 6) {
      const fvrcpDue = !lastFvrcp
        || (ageWeeks < 20 && getWeeksSince(lastFvrcp.dateGiven) >= 4);

      if (fvrcpDue) {
        flags.push({ type: 'VACCINE', label: 'FVRCP Due' });
      }
    }

    const rabiesShots = vaccinesOfType(vaccines, (type) => type.includes('RABIES'));
    if (ageWeeks >= 12 && rabiesShots.length === 0) {
      flags.push({ type: 'VACCINE', label: 'Rabies Due' });
    }

    const felvShots = vaccinesOfType(vaccines, (type) => type.includes('FELV'));
    const firstFelv = earliestVaccine(felvShots);
    const felvDueNoRecord = ageWeeks >= 8 && !firstFelv;
    const felvDueBooster = Boolean(firstFelv && getWeeksSince(firstFelv.dateGiven) >= 4);

    if (felvDueNoRecord || felvDueBooster) {
      flags.push({ type: 'VACCINE', label: 'FeLV Due' });
    }
  }

  return flags;
}
