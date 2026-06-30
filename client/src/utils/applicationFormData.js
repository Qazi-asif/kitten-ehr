const FIELD_LABELS = {
  fullName: 'Full Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  kittenInterest: 'Kitten Interest',
  kittenOfInterest: 'Kitten(s) of Interest',
  experience: 'Experience with Cats',
  experienceLevel: 'Experience Level',
  ownOrRent: 'Own or Rent',
  household: 'Household',
  hasOtherPets: 'Other Pets at Home',
  homeType: 'Home Type',
  availability: 'Availability',
  message: 'Additional Message',
  applicant: 'Applicant',
  kitten: 'Name',
  name: 'Name',
};

const DETAIL_EXCLUDED_KEYS = new Set(['kittenOfInterest', 'kittenInterest', 'kitten', 'currentPets']);

const SHARED_FIELD_ORDER = ['fullName', 'name', 'email', 'phone', 'address', 'ownOrRent', 'household'];
const ADOPTION_FIELD_ORDER = [...SHARED_FIELD_ORDER, 'experience', 'message'];
const FOSTER_FIELD_ORDER = [
  ...SHARED_FIELD_ORDER,
  'experienceLevel',
  'experience',
  'hasOtherPets',
  'homeType',
  'availability',
  'message',
];

const APPLICANT_FIELDS = ['fullName', 'email', 'phone', 'address'];
const ADOPTION_SPECIFIC_FIELDS = ['experience'];
const FOSTER_SPECIFIC_FIELDS = ['experienceLevel', 'homeType', 'availability'];

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

export function getHouseholdPets(formData) {
  const parsed = parseApplicationFormData(formData);
  return Array.isArray(parsed.currentPets) ? parsed.currentPets : [];
}

function formatFieldValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function pickField(parsed, key) {
  return formatFieldValue(parsed[key]);
}

export function getApplicationDisplaySections(formData, type) {
  const parsed = parseApplicationFormData(formData);
  const homeValue = parsed.ownOrRent || parsed.household || parsed.hasOtherPets;
  const specificFields = type === 'Foster' ? FOSTER_SPECIFIC_FIELDS : ADOPTION_SPECIFIC_FIELDS;

  return [
    {
      title: 'Applicant Information',
      fields: APPLICANT_FIELDS.map((key) => ({
        key,
        label: formatApplicationFieldLabel(key),
        value: pickField(parsed, key),
      })),
    },
    {
      title: 'Home Information',
      fields: [
        {
          key: 'ownOrRent',
          label: formatApplicationFieldLabel('ownOrRent'),
          value: formatFieldValue(homeValue),
        },
      ],
    },
    {
      title: type === 'Foster' ? 'Foster Details' : 'Adoption Details',
      fields: specificFields.map((key) => ({
        key,
        label: formatApplicationFieldLabel(key),
        value: pickField(parsed, key),
      })),
    },
    {
      title: 'Additional Message',
      fields: [
        {
          key: 'message',
          label: formatApplicationFieldLabel('message'),
          value: pickField(parsed, 'message'),
        },
      ],
    },
  ];
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
      value !== '' &&
      !Array.isArray(value),
  );

  return [...ordered, ...extras];
}
