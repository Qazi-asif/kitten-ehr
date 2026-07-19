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
    status: { in: ['Available for Adoption', 'In Foster Care'] },
    ...buildPublicWebsiteWhereClause(),
  };
}
