export const CONTENT_CATEGORY_EDUCATION = 'education';
export const CONTENT_CATEGORY_SUCCESS_STORY = 'success-story';

export const EDUCATION_CATEGORIES = [
  {
    name: 'Kitten Care 101',
    description: 'Essential guidance for caring for kittens, from bottle feeding to preparing your home.',
  },
  {
    name: 'Colony & Feral Care',
    description: 'Trap-Neuter-Return, colony care, and support for community cats.',
  },
  {
    name: 'Becoming A Foster',
    description: 'What to expect as a foster, how we support you, and how to get started.',
  },
  {
    name: 'Health & Emergencies',
    description: 'Medical basics, FIV/FeLV information, and what to do when a cat needs urgent help.',
  },
];

const LEGACY_CATEGORY_MAP = {
  'Kitten Care': 'Kitten Care 101',
  Adoption: 'Kitten Care 101',
  Fostering: 'Becoming A Foster',
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
