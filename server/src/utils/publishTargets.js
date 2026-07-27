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
    OR: [
      { publishTargets: { isEmpty: true } },
      { publishTargets: { has: 'WEBSITE' } },
    ],
  };
}

export function buildPublicAvailableKittenWhereClause() {
  return {
    // In Socialization must never appear on the public website.
    status: { in: ['Available for Adoption', 'In Foster Care'] },
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
