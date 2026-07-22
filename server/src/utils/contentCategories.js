export const CONTENT_CATEGORY_EDUCATION = 'education';
export const CONTENT_CATEGORY_SUCCESS_STORY = 'success-story';

/** Canonical Education Hub topic labels (client-approved). */
export const EDUCATION_TOPIC_CATEGORIES = [
  'General Education',
  'Becoming a Foster',
  'Kitten Care',
  'Colony & Feral Care',
  'Health & Emergency Care',
];

const LEGACY_TOPIC_CATEGORIES = [
  'Kitten Care 101',
  'Colony & Feral',
  'Foster Education',
  'Toxins/Health',
  'Kitten Care',
  'Adoption',
  'Fostering',
  'Becoming A Foster',
  'Health & Emergencies',
];

export const ALLOWED_CONTENT_CATEGORIES = [
  CONTENT_CATEGORY_EDUCATION,
  CONTENT_CATEGORY_SUCCESS_STORY,
  ...EDUCATION_TOPIC_CATEGORIES,
  ...LEGACY_TOPIC_CATEGORIES,
];

const LEGACY_TO_CANONICAL = {
  'Kitten Care 101': 'Kitten Care',
  'Kitten Care': 'Kitten Care',
  Adoption: 'Kitten Care',
  'Colony & Feral': 'Colony & Feral Care',
  'Colony & Feral Care': 'Colony & Feral Care',
  'Foster Education': 'Becoming a Foster',
  Fostering: 'Becoming a Foster',
  'Becoming A Foster': 'Becoming a Foster',
  'Becoming a Foster': 'Becoming a Foster',
  'Toxins/Health': 'Health & Emergency Care',
  'Health & Emergencies': 'Health & Emergency Care',
  'Health & Emergency Care': 'Health & Emergency Care',
  'General Education': 'General Education',
};

export function normalizeContentCategory(category = '') {
  const trimmed = category.trim();
  if (!trimmed) return CONTENT_CATEGORY_EDUCATION;
  return LEGACY_TO_CANONICAL[trimmed] || trimmed;
}

export function isAllowedContentCategory(category = '') {
  const normalized = normalizeContentCategory(category);
  return ALLOWED_CONTENT_CATEGORIES.includes(normalized)
    || EDUCATION_TOPIC_CATEGORIES.includes(normalized);
}
