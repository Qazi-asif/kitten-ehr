export const PUBLISH_PLATFORM_IDS = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'X', 'TIKTOK'];

export function normalizePublishTargets(targets) {
  if (!Array.isArray(targets)) return [];
  return PUBLISH_PLATFORM_IDS.filter((id) => targets.includes(id));
}

export function targetsIncludeWebsite(targets) {
  return normalizePublishTargets(targets).includes('WEBSITE');
}
