const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;
const STREET_ADDRESS_PATTERN =
  /\b\d{1,6}\s+(?:[A-Za-z0-9#]+\s+){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Circle|Cir)\.?\b/gi;
const ZIP_PLUS_ADDRESS_PATTERN = /\b\d{5}(?:-\d{4})?\b/g;

/** Only these request keys may be present on AI caption requests. */
const ALLOWED_INPUT_KEYS = new Set(['name', 'story', 'rescueStory', 'breed', 'status']);

/** Sensitive fields that must never be sent to external AI providers. */
const BLOCKED_FIELD_KEYS = new Set([
  'microchipNumber',
  'internalNotes',
  'notes',
  'intakeSource',
  'email',
  'phone',
  'address',
  'signerEmail',
  'signerName',
  'fosterName',
  'fosterEmail',
  'fosterPhone',
  'emergencyContact',
  'applicantName',
  'applicantEmail',
  'applicantPhone',
  'currentFoster',
  'currentFosterId',
  'signedPdfUrl',
  'signatureAudit',
  'primaryPhotoUrl',
  'photoUrl',
  'fivFelvStatus',
  'specialNeeds',
  'fixedStatus',
  'color',
  'sex',
  'dateOfBirth',
  'intakeDate',
  'weightLogs',
  'vaccines',
  'medications',
  'vetAppointments',
  'medicalRecords',
  'placements',
  'documents',
  'websiteFeaturedComment',
]);

const REDACTED = '[redacted]';

function redactPatterns(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED)
    .replace(SSN_PATTERN, REDACTED)
    .replace(CREDIT_CARD_PATTERN, REDACTED)
    .replace(STREET_ADDRESS_PATTERN, REDACTED)
    .replace(ZIP_PLUS_ADDRESS_PATTERN, REDACTED)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function sanitizeTextForAi(text, maxLength = 1200) {
  const redacted = redactPatterns(text);
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, maxLength).trim()}…`;
}

/**
 * Build a minimal public-facing context object for AI providers (CCPA / NIST MAP).
 * Only non-sensitive adoption-marketing fields are included.
 */
export function buildSafeAiContext(body = {}) {
  if (!body || typeof body !== 'object') {
    return { name: '', story: '', breed: '', status: '' };
  }

  for (const key of Object.keys(body)) {
    if (BLOCKED_FIELD_KEYS.has(key)) {
      throw Object.assign(new Error(`Field "${key}" cannot be sent to AI services`), { status: 400 });
    }
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      throw Object.assign(new Error(`Field "${key}" is not permitted for AI services`), { status: 400 });
    }
  }

  const storySource = body.story ?? body.rescueStory ?? '';

  return {
    name: sanitizeTextForAi(String(body.name || ''), 80),
    story: sanitizeTextForAi(String(storySource), 1200),
    breed: sanitizeTextForAi(String(body.breed || ''), 80),
    status: sanitizeTextForAi(String(body.status || ''), 80),
  };
}

/** @deprecated Use buildSafeAiContext */
export const buildSafeAiKittenPayload = buildSafeAiContext;
