export const CONTENT_CATEGORY_EDUCATION = 'education';
export const CONTENT_CATEGORY_SUCCESS_STORY = 'success-story';

export const EDUCATION_CATEGORIES = [
  { name: 'Kitten Care 101' },
  { name: 'Colony & Feral' },
  { name: 'Foster Education' },
  { name: 'Toxins/Health' },
];

const LEGACY_CATEGORY_MAP = {
  'Kitten Care': 'Kitten Care 101',
  Adoption: 'Kitten Care 101',
  Fostering: 'Foster Education',
  'Becoming A Foster': 'Foster Education',
  'Colony & Feral Care': 'Colony & Feral',
  'Health & Emergencies': 'Toxins/Health',
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
