export const ADOPT_CAT_FILTERS = [
  { id: 'all', label: 'All Available' },
  { id: 'kittens', label: 'Kittens' },
  { id: 'adults', label: 'Adults' },
  { id: 'seniors', label: 'Seniors' },
  { id: 'bonded', label: 'Bonded Pairs' },
  { id: 'medical', label: 'Medical / Special Needs' },
];

export function getKittenAgeMonths(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  return (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
}

export function matchesAdoptFilter(kitten, filterId) {
  if (!filterId || filterId === 'all') return true;
  if (filterId === 'bonded') return Boolean(kitten.isBondedPair);
  if (filterId === 'medical') return Boolean(kitten.isMedicalSpecialNeeds);

  const months = getKittenAgeMonths(kitten.dateOfBirth);
  if (months == null) return filterId === 'adults';

  if (filterId === 'kittens') return months < 12;
  if (filterId === 'adults') return months >= 12 && months < 96;
  if (filterId === 'seniors') return months >= 96;
  return true;
}

export const ADOPT_SEX_FILTERS = [
  { id: 'all', label: 'Any Sex' },
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
];

export function matchesSexFilter(kitten, sexFilter) {
  if (!sexFilter || sexFilter === 'all') return true;
  return (kitten.sex || '').toLowerCase() === sexFilter.toLowerCase();
}

export function matchesColorFilter(kitten, colorFilter) {
  const query = colorFilter?.trim().toLowerCase();
  if (!query) return true;
  return (kitten.color || '').toLowerCase().includes(query);
}

// Applies the age-bucket filter, the sex filter, and the color filter
// together (AND). Any filter left at its "no restriction" value is skipped.
export function matchesAllAdoptFilters(kitten, { ageFilter, sexFilter, colorFilter } = {}) {
  return (
    matchesAdoptFilter(kitten, ageFilter)
    && matchesSexFilter(kitten, sexFilter)
    && matchesColorFilter(kitten, colorFilter)
  );
}
