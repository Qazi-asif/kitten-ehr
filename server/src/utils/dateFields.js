/**
 * Field-level date semantics.
 *
 * Every date column in this schema is `DateTime`, so nothing in the type system
 * distinguishes a calendar day ("the cat was vaccinated on the 4th") from a
 * moment in time ("weighed at 2:30pm"). That ambiguity is what made the Pacific
 * date shift recur across CR-52, CR-53, CR-68 and CR-83: each field was fixed by
 * whoever noticed it, using whichever parser they reached for.
 *
 * This registry makes the distinction data instead of knowledge. Route writes
 * through `normalizeDateField` and the parser choice stops being a judgement
 * call at the call site.
 *
 * DATE_ONLY  - a calendar day. Stored anchored to Pacific midnight. Any time
 *              component on input is discarded.
 * TIMESTAMP  - a moment in time. Un-zoned input is read as Pacific wall time.
 */
import { parsePacificDateOnly, parsePacificDateTime } from './pacificDate.js';

export const DATE_ONLY = 'DATE_ONLY';
export const TIMESTAMP = 'TIMESTAMP';

/**
 * Keyed by `Model.field`. Fields with `@default(now())` are set by the database
 * and never parsed from user input, so they are intentionally absent — they only
 * need Pacific *display*, not Pacific parsing.
 */
export const DATE_FIELD_KINDS = {
  'Kitten.dateOfBirth': DATE_ONLY,
  'Kitten.intakeDate': DATE_ONLY,
  'Kitten.outcomeDate': DATE_ONLY,

  'Litter.intakeDate': DATE_ONLY,

  'Placement.intakeDate': DATE_ONLY,
  'Placement.dischargeDate': DATE_ONLY,

  'Vaccine.dateGiven': DATE_ONLY,
  'Vaccine.nextDueDate': DATE_ONLY,

  'Medication.startDate': DATE_ONLY,
  'Medication.endDate': DATE_ONLY,

  'VetAppointment.followUpDate': DATE_ONLY,

  'ActiveProtocol.activationDate': DATE_ONLY,
  'ProtocolDose.scheduledDate': DATE_ONLY,

  'Transaction.date': DATE_ONLY,

  // Weight entries are recorded with a time of day: the form control is
  // `datetime-local`. This is the field whose misclassification produced the
  // reported ~7 hour backward shift.
  'WeightLog.date': TIMESTAMP,

  // Appointments and events have start times.
  'VetAppointment.date': TIMESTAMP,
  'Event.date': TIMESTAMP,
  'Event.endDate': TIMESTAMP,

  'ProtocolDose.administeredAt': TIMESTAMP,
  'SocialPost.scheduledFor': TIMESTAMP,
};

/**
 * Parse a user-supplied date for a specific field.
 *
 * Empty input yields null so callers can clear nullable columns. Throws on an
 * unregistered field: a new date column should not silently pick a convention.
 */
export function normalizeDateField(fieldPath, value) {
  const kind = DATE_FIELD_KINDS[fieldPath];
  if (!kind) {
    throw new Error(
      `normalizeDateField: unregistered date field "${fieldPath}". `
        + 'Add it to DATE_FIELD_KINDS as DATE_ONLY or TIMESTAMP.',
    );
  }
  if (value == null || value === '') return null;
  return kind === TIMESTAMP ? parsePacificDateTime(value) : parsePacificDateOnly(value);
}

/** Curried form for controllers that touch several fields on one model. */
export function dateNormalizerFor(model) {
  return (field, value) => normalizeDateField(`${model}.${field}`, value);
}
