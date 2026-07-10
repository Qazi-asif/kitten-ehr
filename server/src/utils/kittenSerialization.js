import { enrichKittensWithPhotos } from './enrichKittenPhotos.js';

export { enrichKittensWithPhotos };

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
  isBondedPair: true,
  bondedWithKittenId: true,
  bondedWithName: true,
  isMedicalSpecialNeeds: true,
  litter: { select: { id: true, name: true } },
  currentFoster: { select: { id: true, name: true } },
  bondedWithKitten: { select: { id: true, name: true } },
};

export function serializeKittenForList(kitten) {
  return {
    ...kitten,
    hasPrimaryPhoto: kitten.hasPrimaryPhoto ?? Boolean(kitten.primaryPhotoUrl),
    primaryPhotoUrl: stripInlineDataUrl(kitten.primaryPhotoUrl),
  };
}

export function serializeKittenForDetail(kitten) {
  if (!kitten) return kitten;

  return {
    ...kitten,
    hasPrimaryPhoto: kitten.hasPrimaryPhoto ?? Boolean(kitten.primaryPhotoUrl),
  };
}
