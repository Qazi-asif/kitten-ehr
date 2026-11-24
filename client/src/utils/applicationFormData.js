const FIELD_LABELS = {
  fullName: 'Full Name',
  firstName: 'First Name',
  lastName: 'Last Name',
  confirmAge18: '18 or Older',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  kittenInterest: 'Kitten Interest',
  kittenOfInterest: 'Kitten(s) of Interest',
  unlistedCatDescription: 'Cat Not Listed',
  whyThisCat: 'Why This Cat',
  bondedPair: 'Open to a Bonded Pair',
  householdMembers: 'Who Lives in the Home',
  allergicToCats: 'Allergic to Cats',
  allergyPlan: 'Allergy Plan',
  primaryCaregiver: 'Primary Caregiver',
  hoursHomeAlone: 'Hours Home Alone',
  travelCare: 'Care When Traveling',
  unableToCarePlan: 'Plan If Unable to Care',
  experience: 'Experience with Cats',
  experienceLevel: 'Experience Level',
  ownOrRent: 'Own or Rent',
  landlordContact: 'Landlord Contact',
  leaseAllowsCats: 'Lease Allows Cats',
  ifMovePlan: 'Plan If You Move',
  household: 'Household',
  hasOtherPets: 'Other Pets at Home',
  hasCurrentPets: 'Currently Has Pets',
  currentPetDetails: 'Current Pet Details',
  currentCatsOutside: 'Current Cats Go Outside',
  currentCatsDeclawed: 'Current Cats Declawed',
  lastVetVisit: 'Last Vet Visit',
  hadPastPets: 'Pets in the Last 5 Years',
  pastPetsDetails: 'Past Pet Details',
  vetContact: 'Vet Contact',
  vetContactConsent: 'Vet Contact Consent',
  newCatOutside: 'New Cat Goes Outside',
  considerDeclawing: 'Would Consider Declawing',
  litterBoxPlan: 'If Litter Box Stops',
  scratchingPlan: 'If Scratching Furniture',
  otherPetsConflictPlan: 'If Not Getting Along with Other Pets',
  canCoverVetBill: 'Can Cover a $500 Vet Bill',
  agreeHomeCheck: 'Agrees to Home Check',
  agreeSpayNeuter: 'Agrees to Spay/Neuter Terms',
  agreeTruthful: 'Answers Are True',
  agreeMayDecline: 'Rescue May Decline',
  homeType: 'Home Type',
  availability: 'Availability',
  capacity: 'Foster Capacity',
  isolationRoom: 'Isolation Room Available',
  vehicleAccess: 'Vehicle Access',
  unexpectedStopPlan: 'If Fostering Stops Unexpectedly',
  suppliesHave: 'Supplies They Have',
  suppliesNeeded: 'Supplies They Need',
  medicationExperience: 'Medications Administered to Cats',
  bottleFeedingExperience: 'Bottle-Feeding Experience',
  bottleFeedingAge: 'Bottle-Feeding Age Range',
  message: 'Additional Message',
  applicant: 'Applicant',
  kitten: 'Name',
  name: 'Name',
};

const DETAIL_EXCLUDED_KEYS = new Set([
  'kittenOfInterest',
  'kittenInterest',
  'kitten',
  'currentPets',
  'selectedCatIds',
  'lockedCatId',
]);

const REVISION_MARKERS = [
  'whyThisCat',
  'hasCurrentPets',
  'currentPetDetails',
  'bondedPair',
  'confirmAge18',
  'firstName',
  'considerDeclawing',
];

const SHARED_FIELD_ORDER = ['fullName', 'name', 'email', 'phone', 'address', 'ownOrRent', 'household'];
const ADOPTION_FIELD_ORDER = [...SHARED_FIELD_ORDER, 'experience', 'message'];
const REVISED_ADOPTION_FIELD_ORDER = [
  'firstName',
  'lastName',
  'fullName',
  'email',
  'phone',
  'address',
  'confirmAge18',
  'unlistedCatDescription',
  'whyThisCat',
  'bondedPair',
  'householdMembers',
  'allergicToCats',
  'allergyPlan',
  'primaryCaregiver',
  'hoursHomeAlone',
  'travelCare',
  'unableToCarePlan',
  'homeType',
  'ownOrRent',
  'landlordContact',
  'leaseAllowsCats',
  'ifMovePlan',
  'hasCurrentPets',
  'currentPetDetails',
  'currentCatsOutside',
  'currentCatsDeclawed',
  'lastVetVisit',
  'hadPastPets',
  'pastPetsDetails',
  'vetContact',
  'vetContactConsent',
  'newCatOutside',
  'considerDeclawing',
  'litterBoxPlan',
  'scratchingPlan',
  'otherPetsConflictPlan',
  'canCoverVetBill',
  'agreeHomeCheck',
  'agreeSpayNeuter',
  'agreeTruthful',
  'agreeMayDecline',
  'message',
];

const REVISED_ADOPTION_SECTIONS = [
  {
    title: 'About You',
    keys: ['firstName', 'lastName', 'email', 'phone', 'address', 'confirmAge18'],
  },
  {
    title: 'The Cat',
    keys: ['unlistedCatDescription', 'whyThisCat', 'bondedPair'],
  },
  {
    title: 'Household',
    keys: [
      'householdMembers',
      'allergicToCats',
      'allergyPlan',
      'primaryCaregiver',
      'hoursHomeAlone',
      'travelCare',
      'unableToCarePlan',
    ],
  },
  {
    title: 'Your Home',
    keys: ['homeType', 'ownOrRent', 'landlordContact', 'leaseAllowsCats', 'ifMovePlan'],
  },
  {
    title: 'Current and Past Pets',
    keys: [
      'hasCurrentPets',
      'currentPetDetails',
      'currentCatsOutside',
      'currentCatsDeclawed',
      'lastVetVisit',
      'hadPastPets',
      'pastPetsDetails',
      'vetContact',
      'vetContactConsent',
    ],
  },
  {
    title: 'Care and Commitment',
    keys: [
      'newCatOutside',
      'considerDeclawing',
      'litterBoxPlan',
      'scratchingPlan',
      'otherPetsConflictPlan',
      'canCoverVetBill',
      'agreeHomeCheck',
      'agreeSpayNeuter',
      'agreeTruthful',
      'agreeMayDecline',
      'message',
    ],
  },
];
const FOSTER_FIELD_ORDER = [
  ...SHARED_FIELD_ORDER,
  'experienceLevel',
  'experience',
  'hasOtherPets',
  'homeType',
  'availability',
  'capacity',
  'isolationRoom',
  'vehicleAccess',
  'unexpectedStopPlan',
  'suppliesHave',
  'suppliesNeeded',
  'medicationExperience',
  'bottleFeedingExperience',
  'bottleFeedingAge',
  'message',
];

const APPLICANT_FIELDS = ['fullName', 'email', 'phone', 'address'];
const ADOPTION_SPECIFIC_FIELDS = ['experience'];
const FOSTER_SPECIFIC_FIELDS = [
  'experienceLevel',
  'homeType',
  'availability',
  'capacity',
  'isolationRoom',
  'vehicleAccess',
  'unexpectedStopPlan',
  'suppliesHave',
  'suppliesNeeded',
  'medicationExperience',
  'bottleFeedingExperience',
  'bottleFeedingAge',
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
  const combinedName = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
  return parsed.fullName || combinedName || parsed.applicant || parsed.name || parsed.email || 'Application';
}

function isRevisedAdoptionParsed(parsed) {
  return REVISION_MARKERS.some((key) => {
    const value = parsed[key];
    return value != null && value !== '';
  });
}

export function isRevisedAdoptionApplication(formData) {
  return isRevisedAdoptionParsed(parseApplicationFormData(formData));
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
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function hasDisplayValue(value) {
  if (typeof value === 'boolean') return true;
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function sectionFields(parsed, keys) {
  return keys
    .filter((key) => hasDisplayValue(parsed[key]))
    .map((key) => ({
      key,
      label: formatApplicationFieldLabel(key),
      value: formatFieldValue(parsed[key]),
    }));
}

function revisedAdoptionSections(parsed) {
  return REVISED_ADOPTION_SECTIONS
    .map((section) => ({
      title: section.title,
      fields: sectionFields(parsed, section.keys),
    }))
    .filter((section) => section.fields.length > 0);
}

function pickField(parsed, key) {
  return formatFieldValue(parsed[key]);
}

export function getApplicationDisplaySections(formData, type) {
  const parsed = parseApplicationFormData(formData);
  if (type !== 'Foster' && isRevisedAdoptionParsed(parsed)) {
    return revisedAdoptionSections(parsed);
  }
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
  const revised = type !== 'Foster' && isRevisedAdoptionParsed(parsed);
  const order = type === 'Foster'
    ? FOSTER_FIELD_ORDER
    : (revised ? REVISED_ADOPTION_FIELD_ORDER : ADOPTION_FIELD_ORDER);
  const seen = new Set();

  const ordered = order
    .filter((key) => !DETAIL_EXCLUDED_KEYS.has(key) && hasDisplayValue(parsed[key]))
    .map((key) => {
      seen.add(key);
      return [key, parsed[key]];
    });

  const extras = Object.entries(parsed).filter(
    ([key, value]) =>
      !seen.has(key) &&
      !DETAIL_EXCLUDED_KEYS.has(key) &&
      hasDisplayValue(value) &&
      !Array.isArray(value),
  );

  return [...ordered, ...extras];
}
