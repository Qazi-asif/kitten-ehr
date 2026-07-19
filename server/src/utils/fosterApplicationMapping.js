// Translates a Foster application's free-text answers into the Foster
// record's controlled vocabularies (EXPERIENCE_LEVELS / CAPABILITY_FLAGS,
// both defined in fosterValidation.js). The application's wording never
// lines up 1:1 with those enums, so these are deliberate, reviewed mappings
// (see foster-auto-provision-plan.md §4), not literal pass-throughs. Pure
// functions - no I/O, no side effects - so they're testable standalone.

// Approved mapping: None/Some -> Beginner, Experienced -> Intermediate,
// Advanced -> Advanced. Matched by exact string against the application's
// fixed FOSTER_EXPERIENCE_OPTIONS list (ApplicationForm.jsx) - these are
// dropdown options, not free text, so exact match is correct and more
// robust than fuzzy/substring matching would be.
const EXPERIENCE_LEVEL_TRANSLATIONS = {
  'None (first-time foster)': 'Beginner',
  "Some (I've had cats of my own)": 'Beginner',
  "Experienced (I've fostered before)": 'Intermediate',
  'Advanced (comfortable with bottle babies / medical cases)': 'Advanced',
};

export function translateExperienceLevel(applicationExperienceLevel) {
  return EXPERIENCE_LEVEL_TRANSLATIONS[applicationExperienceLevel?.trim()] || '';
}

// Best-effort, intentionally partial per the approved plan: most of the
// application's capacity checkboxes (e.g. "1 adult cat", "Senior cat",
// "Bonded pair (adults)", "Kittens (weaned)") have no equivalent Foster
// capabilityFlag and are left unmapped. feral_tnr is never auto-set (no
// application option corresponds to it). large_capacity is never auto-set
// here either - it's normally derived from maxKittens, which this
// application doesn't collect (see plan §3, maxKittens stays default 0).
const CAPACITY_OPTION_TO_FLAG = {
  'Neonate kittens (bottle-feeding every 2 to 4 hours)': 'bottle_babies',
  'Special needs / medical cats': 'medical_cases',
};

export function translateCapabilityFlags(applicationCapacity) {
  const selections = Array.isArray(applicationCapacity) ? applicationCapacity : [];
  const flags = selections
    .map((option) => CAPACITY_OPTION_TO_FLAG[option])
    .filter(Boolean);
  return [...new Set(flags)].join(',');
}
