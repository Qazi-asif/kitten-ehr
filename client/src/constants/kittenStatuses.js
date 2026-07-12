// Canonical kitten status options, mirrored from the backend's KITTEN_STATUSES
// enum (server/src/validations/kittenValidation.js). Keep these two lists in
// sync — this is the single source of truth for the client.
export const KITTEN_STATUS_OPTIONS = [
  'In Foster Care',
  'Available for Adoption',
  'Adopted',
  'Medical Hold',
  'Transferred',
  'Deceased',
];
