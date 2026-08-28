/**
 * Reminder category keys and labels (CR-97 to CR-100).
 *
 * Must stay in sync with server/src/services/reminderCategories.js, which owns
 * the actual predicates. This file exists only so the cats page can render a
 * filter dropdown without a round trip.
 */
export const REMINDER_FILTER_OPTIONS = [
  { key: 'spayNeuterEligible', label: 'Spay/Neuter Eligible' },
  { key: 'fvrcpNeeded', label: 'FVRCP Needed' },
  { key: 'rabiesEligible', label: 'Rabies Eligible' },
  { key: 'medsBeingGiven', label: 'Meds Being Given' },
  { key: 'dewormingDue', label: 'Deworming Due' },
];

export const REMINDER_FILTER_KEYS = REMINDER_FILTER_OPTIONS.map((option) => option.key);
