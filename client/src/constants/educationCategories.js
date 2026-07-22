export const CONTENT_CATEGORY_EDUCATION = 'education';
export const CONTENT_CATEGORY_SUCCESS_STORY = 'success-story';

export const EDUCATION_CATEGORIES = [
  { name: 'General Education' },
  { name: 'Becoming a Foster' },
  { name: 'Kitten Care' },
  { name: 'Colony & Feral Care' },
  { name: 'Health & Emergency Care' },
];

const LEGACY_CATEGORY_MAP = {
  'Kitten Care 101': 'Kitten Care',
  'Kitten Care': 'Kitten Care',
  Adoption: 'Kitten Care',
  'Colony & Feral': 'Colony & Feral Care',
  'Colony & Feral Care': 'Colony & Feral Care',
  'Foster Education': 'Becoming a Foster',
  Fostering: 'Becoming a Foster',
  'Becoming A Foster': 'Becoming a Foster',
  'Toxins/Health': 'Health & Emergency Care',
  'Health & Emergencies': 'Health & Emergency Care',
};

export function normalizeEducationCategory(category = '') {
  const trimmed = category.trim();
  return LEGACY_CATEGORY_MAP[trimmed] || trimmed;
}

export function articleExcerpt(body = '', maxLength = 140) {
  const plain = body
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) return '';
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}…`;
}
