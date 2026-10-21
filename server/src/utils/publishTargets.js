export const PUBLISH_PLATFORM_IDS = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'X', 'TIKTOK', 'FOSTER_CHECKLIST'];

export function normalizePublishTargets(targets) {
  if (!Array.isArray(targets)) return [];
  return PUBLISH_PLATFORM_IDS.filter((id) => targets.includes(id));
}

export function targetsIncludeWebsite(targets) {
  return normalizePublishTargets(targets).includes('WEBSITE');
}

export function buildPublicWebsiteWhereClause() {
  return {
    isListedOnWebsite: true,
    isActive: true,
  };
}

/** Content, events, and kitten updates still publish via publishTargets. */
export function buildPublicPublishTargetsWhereClause() {
  return {
    OR: [
      { publishTargets: { isEmpty: true } },
      { publishTargets: { has: 'WEBSITE' } },
    ],
  };
}

export function buildPublicAvailableKittenWhereClause() {
  return {
    // Website visibility is the per-cat toggle (isListedOnWebsite), not status.
    // In Socialization and terminal outcomes still never appear on the public list.
    status: { notIn: ['In Socialization', 'Adopted', 'Transferred', 'Deceased', 'Released'] },
    ...buildPublicWebsiteWhereClause(),
  };
}

/** Home page "Meet the Cats" — Available for Adoption only. */
export function buildPublicFeaturedKittenWhereClause() {
  return {
    status: 'Available for Adoption',
    ...buildPublicWebsiteWhereClause(),
  };
}
