export function isUnknownPublishTargetsError(error) {
  const message = String(error?.message || '');
  return message.includes('publishTargets') || message.includes('Unknown argument');
}

export function withLegacyWebsiteFlag(data, publishTargets) {
  const next = { ...data };
  delete next.publishTargets;

  if (Array.isArray(publishTargets)) {
    next.isListedOnWebsite = publishTargets.includes('WEBSITE');
  }

  return next;
}
