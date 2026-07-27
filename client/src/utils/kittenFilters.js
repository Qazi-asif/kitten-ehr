export const ADOPT_CAT_FILTERS = [
  { id: 'all', label: 'All Available' },
  { id: 'kittens', label: 'Kittens' },
  { id: 'adults', label: 'Cats' },
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

export const ADOPT_COLOR_CHIP_OPTIONS = [
  { id: 'all', label: 'Any Color' },
  { id: 'White', label: 'White' },
  { id: 'Black', label: 'Black' },
  { id: 'Grey', label: 'Grey' },
  { id: 'Brown', label: 'Brown' },
  { id: 'Orange', label: 'Orange/Ginger' },
  { id: 'Calico', label: 'Calico' },
  { id: 'Siamese', label: 'Siamese' },
  { id: 'Tortoiseshell', label: 'Tortoiseshell' },
];

export function matchesSexFilter(kitten, sexFilter) {
  if (!sexFilter || sexFilter === 'all') return true;
  return (kitten.sex || '').toLowerCase() === sexFilter.toLowerCase();
}

export function matchesColorFilter(kitten, colorFilter) {
  if (!colorFilter || colorFilter === 'all') return true;
  const color = (kitten.color || '').toLowerCase();
  const query = String(colorFilter).toLowerCase();

  if (query === 'grey' || query === 'gray') {
    return color.includes('grey') || color.includes('gray');
  }
  if (query === 'orange' || query === 'ginger') {
    return color.includes('orange') || color.includes('ginger') || color.includes('red');
  }
  if (query === 'tortoiseshell') {
    return color.includes('tortoiseshell') || color.includes('tortie') || color.includes('torbie');
  }
  return color.includes(query);
}

export function matchesAllAdoptFilters(kitten, { ageFilter, sexFilter, colorFilter } = {}) {
  return (
    matchesAdoptFilter(kitten, ageFilter)
    && matchesSexFilter(kitten, sexFilter)
    && matchesColorFilter(kitten, colorFilter)
  );
}
