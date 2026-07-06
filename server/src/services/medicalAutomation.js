const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const SPAY_NEUTER_WEIGHT_GRAMS = 908;

function getAgeInWeeks(dateOfBirth, asOf = new Date()) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const ageMs = asOf.getTime() - dob.getTime();
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

export async function evaluateKittenFlags(kitten, vaccines = [], weightLogs = []) {
  const flags = [];
  const ageWeeks = getAgeInWeeks(kitten?.dateOfBirth);
  const latestWeightGrams = getLatestWeightGrams(weightLogs);

  if (latestWeightGrams != null && latestWeightGrams > SPAY_NEUTER_WEIGHT_GRAMS) {
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
