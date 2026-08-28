/**
 * Reminder categories (CR-97 through CR-100).
 *
 * Each category is defined once, as a Prisma `where` fragment on Kitten. The
 * dashboard counts them, the reminders page lists them, and the cats page
 * filters by them — all from this single definition, so a category and its
 * click-through can never drift apart.
 */
import { startOfPacificTodayUtc, addPacificDays, endOfPacificDayUtc } from '../utils/pacificDate.js';

/** Excludes terminal outcomes so past-tense records never surface as action items. */
export const ACTIVE_KITTEN_STATUSES = [
  'In Foster Care',
  'Available for Adoption',
  'Medical Hold',
  'In Socialization',
];

const ACTIVE_MEDICATION_STATUSES = ['Active', 'ACTIVE'];

/**
 * Substrings identifying a deworming drug. Deliberately short stems: drug names
 * are free text and misspellings are common ("Pyrontal Paomate" appears in the
 * live data), so "pyr" and "paomate"/"pamoate" both need to hit.
 */
const DEWORMER_NAME_FRAGMENTS = [
  'deworm',
  'worm',
  'pyrantel',
  'pyrontal',
  'pamoate',
  'paomate',
  'panacur',
  'fenbendazole',
  'praziquantel',
  'drontal',
  'strongid',
  'profender',
  'albendazole',
];

/** UTC instant for Pacific midnight `weeks` ago; a cat born on/before it is at least that old. */
function bornAtLeastWeeksAgo(weeks) {
  return endOfPacificDayUtc(addPacificDays(startOfPacificTodayUtc(), -7 * weeks));
}

function activeKitten() {
  return { status: { in: ACTIVE_KITTEN_STATUSES } };
}

export const REMINDER_CATEGORIES = [
  {
    key: 'spayNeuterEligible',
    label: 'Spay/Neuter Eligible',
    tone: 'purple',
    description: 'Cats not yet fixed (Intact or Unknown).',
    buildWhere: () => ({
      ...activeKitten(),
      // "Intact OR Unknown" — the schema stores Unknown as an empty string, and
      // legacy rows may hold other free text, so exclude the fixed value rather
      // than enumerating the rest.
      fixedStatus: { not: 'Spayed/Neutered' },
    }),
  },
  {
    key: 'fvrcpNeeded',
    label: 'FVRCP Needed',
    tone: 'rose',
    description: 'At least 6 weeks old and either never had FVRCP or it is now due.',
    buildWhere: () => {
      const today = endOfPacificDayUtc(startOfPacificTodayUtc());
      return {
        ...activeKitten(),
        dateOfBirth: { not: null, lte: bornAtLeastWeeksAgo(6) },
        OR: [
          { vaccines: { none: { type: { contains: 'FVRCP', mode: 'insensitive' } } } },
          {
            vaccines: {
              some: {
                type: { contains: 'FVRCP', mode: 'insensitive' },
                nextDueDate: { not: null, lte: today },
              },
            },
          },
        ],
      };
    },
  },
  {
    key: 'rabiesEligible',
    label: 'Rabies Eligible',
    tone: 'amber',
    description: 'At least 12 weeks old with no rabies vaccine on record.',
    buildWhere: () => ({
      ...activeKitten(),
      dateOfBirth: { not: null, lte: bornAtLeastWeeksAgo(12) },
      vaccines: { none: { type: { contains: 'RABIES', mode: 'insensitive' } } },
    }),
  },
  {
    key: 'medsBeingGiven',
    label: 'Meds Being Given',
    tone: 'sky',
    description: 'Currently on at least one active medication.',
    buildWhere: () => {
      const today = endOfPacificDayUtc(startOfPacificTodayUtc());
      return {
        ...activeKitten(),
        medications: {
          some: {
            status: { in: ACTIVE_MEDICATION_STATUSES },
            OR: [{ endDate: null }, { endDate: { gte: startOfPacificTodayUtc() } }],
            startDate: { lte: today },
          },
        },
      };
    },
  },
  {
    key: 'dewormingDue',
    label: 'Deworming Due',
    tone: 'emerald',
    description: 'A deworming dose is scheduled on or before today and not yet given.',
    buildWhere: () => {
      const today = endOfPacificDayUtc(startOfPacificTodayUtc());
      // Matched on substrings rather than exact names because drug names are
      // free text and are commonly misspelled in practice (the live data has
      // "Pyrontal Paomate" for pyrantel pamoate), so short stems are used.
      const dewormer = DEWORMER_NAME_FRAGMENTS.map((fragment) => ({
        drugName: { contains: fragment, mode: 'insensitive' },
      }));
      return {
        ...activeKitten(),
        activeProtocols: {
          some: {
            status: 'ACTIVE',
            doses: {
              some: {
                status: 'SCHEDULED',
                scheduledDate: { lte: today },
                protocolDrug: { OR: dewormer },
              },
            },
          },
        },
      };
    },
  },
];

export const REMINDER_CATEGORY_KEYS = REMINDER_CATEGORIES.map((c) => c.key);

export function getReminderCategory(key) {
  return REMINDER_CATEGORIES.find((category) => category.key === key) || null;
}

/**
 * Prisma `where` for one category, or null when the key is unknown.
 * Shared by the dashboard, the reminders page and the cats list filter.
 */
export function buildReminderWhere(key) {
  const category = getReminderCategory(key);
  return category ? category.buildWhere() : null;
}

/** Counts for every category, for the collapsed dashboard rows. */
export async function getReminderCategoryCounts(prisma) {
  const counts = await Promise.all(
    REMINDER_CATEGORIES.map(async (category) => {
      const count = await prisma.kitten.count({ where: category.buildWhere() });
      return {
        key: category.key,
        label: category.label,
        description: category.description,
        tone: category.tone,
        count,
      };
    }),
  );
  return counts;
}

/** Full cat list for one category, for the all-reminders view. */
export async function getReminderCategoryItems(prisma, key, { limit } = {}) {
  const where = buildReminderWhere(key);
  if (!where) return null;
  return prisma.kitten.findMany({
    where,
    select: {
      id: true,
      name: true,
      status: true,
      dateOfBirth: true,
      fixedStatus: true,
      intakeDate: true,
    },
    orderBy: { name: 'asc' },
    ...(limit ? { take: limit } : {}),
  });
}
