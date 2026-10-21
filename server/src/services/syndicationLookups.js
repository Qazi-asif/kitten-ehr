export const LOOKUP_VERSION = 1;

export const DEFAULT_BREED_MAP = [
  ['domestic short hair', 'Domestic Short Hair'],
  ['domestic shorthair', 'Domestic Short Hair'],
  ['dsh', 'Domestic Short Hair'],
  ['domestic medium hair', 'Domestic Medium Hair'],
  ['domestic mediumhair', 'Domestic Medium Hair'],
  ['dmh', 'Domestic Medium Hair'],
  ['domestic long hair', 'Domestic Long Hair'],
  ['domestic longhair', 'Domestic Long Hair'],
  ['dlh', 'Domestic Long Hair'],
];

export const DEFAULT_BREED = 'Domestic Short Hair';

const COLOR_PSEUDO_BREEDS = new Set([
  'tuxedo', 'orange', 'calico', 'tabby', 'tortie', 'tortoiseshell', 'black', 'white', 'gray', 'grey',
]);

export function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

export function mapBreed(source, lookupMap = new Map()) {
  const key = normalizeLookupKey(source);
  if (!key || COLOR_PSEUDO_BREEDS.has(key)) return DEFAULT_BREED;
  if (lookupMap.has(key)) return lookupMap.get(key);
  const hit = DEFAULT_BREED_MAP.find(([from]) => from === key);
  if (hit) return hit[1];
  if (key.includes('short')) return 'Domestic Short Hair';
  if (key.includes('medium')) return 'Domestic Medium Hair';
  if (key.includes('long')) return 'Domestic Long Hair';
  return DEFAULT_BREED;
}

export function mapSex(value) {
  const key = normalizeLookupKey(value);
  if (key === 'm' || key === 'male') return 'Male';
  if (key === 'f' || key === 'female') return 'Female';
  return '';
}

export function mapNegativeFlag(value) {
  if (value === false || value === 'No' || value === 'no') return 'No';
  return '';
}

export function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
