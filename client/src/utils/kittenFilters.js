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
