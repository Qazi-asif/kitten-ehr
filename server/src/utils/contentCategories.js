export const CONTENT_CATEGORY_EDUCATION = 'education';
export const CONTENT_CATEGORY_SUCCESS_STORY = 'success-story';

export const EDUCATION_TOPIC_CATEGORIES = [
  'Kitten Care 101',
  'Colony & Feral',
  'Foster Education',
  'Toxins/Health',
];

const LEGACY_TOPIC_CATEGORIES = [
  'Kitten Care',
  'Adoption',
  'Fostering',
  'Colony & Feral Care',
  'Becoming A Foster',
  'Health & Emergencies',
];

export const ALLOWED_CONTENT_CATEGORIES = [
  CONTENT_CATEGORY_EDUCATION,
  CONTENT_CATEGORY_SUCCESS_STORY,
  ...EDUCATION_TOPIC_CATEGORIES,
  ...LEGACY_TOPIC_CATEGORIES,
];

export function normalizeContentCategory(category = '') {
  const trimmed = category.trim();
  return trimmed || CONTENT_CATEGORY_EDUCATION;
}

export function isAllowedContentCategory(category = '') {
  const normalized = normalizeContentCategory(category);
  return ALLOWED_CONTENT_CATEGORIES.includes(normalized);
}
