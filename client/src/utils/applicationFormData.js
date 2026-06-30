const FIELD_LABELS = {
  fullName: 'Full Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  kittenInterest: 'Kitten Interest',
  kittenOfInterest: 'Kitten(s) of Interest',
  experience: 'Experience with Cats',
  experienceLevel: 'Experience Level',
  household: 'Household',
  hasOtherPets: 'Other Pets at Home',
  homeType: 'Home Type',
  availability: 'Availability',
  message: 'Additional Message',
  applicant: 'Applicant',
  kitten: 'Kitten',
  name: 'Name',
};

const DETAIL_EXCLUDED_KEYS = new Set(['kittenOfInterest', 'kittenInterest', 'kitten']);

const ADOPTION_FIELD_ORDER = ['fullName', 'name', 'email', 'phone', 'address', 'experience', 'household', 'message'];
const FOSTER_FIELD_ORDER = [
  'fullName',
  'name',
  'email',
  'phone',
  'address',
  'experienceLevel',
  'experience',
  'hasOtherPets',
  'homeType',
  'availability',
  'household',
  'message',
];

export function parseApplicationFormData(formData) {
  if (!formData) return {};

  if (typeof formData === 'object' && !Array.isArray(formData)) {
    return formData;
  }

  if (typeof formData !== 'string') {
    return { details: String(formData) };
  }

  try {
    let parsed = JSON.parse(formData);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return typeof parsed === 'object' && parsed !== null ? parsed : { details: String(parsed) };
  } catch {
    return { details: formData };
  }
}

export function formatApplicationFieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());
}

export function getApplicationSummary(formData) {
  const parsed = parseApplicationFormData(formData);
  return parsed.fullName || parsed.applicant || parsed.name || parsed.email || 'Application';
}

export function resolveKittenOfInterest(formData, kittenOfInterest) {
  if (kittenOfInterest?.trim()) return kittenOfInterest.trim();
  const parsed = parseApplicationFormData(formData);
  return parsed.kittenOfInterest || parsed.kittenInterest || parsed.kitten || '';
}

export function getApplicationDetailFields(formData, type) {
  const parsed = parseApplicationFormData(formData);
  const order = type === 'Foster' ? FOSTER_FIELD_ORDER : ADOPTION_FIELD_ORDER;
  const seen = new Set();

  const ordered = order
    .filter((key) => {
      const value = parsed[key];
      return !DETAIL_EXCLUDED_KEYS.has(key) && value != null && value !== '';
    })
    .map((key) => {
      seen.add(key);
      return [key, parsed[key]];
    });

  const extras = Object.entries(parsed).filter(
    ([key, value]) =>
      !seen.has(key) &&
      !DETAIL_EXCLUDED_KEYS.has(key) &&
      value != null &&
      value !== '',
  );

  return [...ordered, ...extras];
}
