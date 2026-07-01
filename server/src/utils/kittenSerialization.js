export function isInlineDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

export function stripInlineDataUrl(value) {
  return isInlineDataUrl(value) ? null : value ?? null;
}

export const kittenListSelect = {
  id: true,
  name: true,
  status: true,
  breed: true,
  color: true,
  dateOfBirth: true,
  sex: true,
  fixedStatus: true,
  intakeDate: true,
  intakeSource: true,
  primaryPhotoUrl: true,
  litterId: true,
  currentFosterId: true,
  litter: { select: { id: true, name: true } },
  currentFoster: { select: { id: true, name: true } },
};

export function serializeKittenForList(kitten) {
  const hasPrimaryPhoto = Boolean(kitten.primaryPhotoUrl);
  return {
    ...kitten,
    hasPrimaryPhoto,
    primaryPhotoUrl: stripInlineDataUrl(kitten.primaryPhotoUrl),
  };
}

export function serializeKittenForDetail(kitten) {
  if (!kitten) return kitten;

  const hasPrimaryPhoto = Boolean(kitten.primaryPhotoUrl);
  return {
    ...kitten,
    hasPrimaryPhoto,
    primaryPhotoUrl: stripInlineDataUrl(kitten.primaryPhotoUrl),
  };
}
