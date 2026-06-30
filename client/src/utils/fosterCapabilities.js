export const CAPABILITY_OPTIONS = [
  { value: 'bottle_babies', label: 'Bottle Babies' },
  { value: 'medical_cases', label: 'Medical Cases' },
  { value: 'feral_tnr', label: 'Feral/TNR' },
];

export const CAPABILITY_LABELS = {
  bottle_babies: 'Bottle Babies',
  medical_cases: 'Medical Cases',
  feral_tnr: 'Feral/TNR',
  large_capacity: 'Large Capacity',
};

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function parseCapabilityFlags(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean);
}

export function buildCapabilityFlags(selectedFlags, maxKittens = 0) {
  const flags = selectedFlags.filter(Boolean);
  if (maxKittens >= 4 && !flags.includes('large_capacity')) {
    flags.push('large_capacity');
  }
  return [...new Set(flags)].join(',');
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
