import { enrichKittensWithPhotos } from './enrichKittenPhotos.js';

export { enrichKittensWithPhotos };

export function isInlineDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

export function stripInlineDataUrl(value) {
  return isInlineDataUrl(value) ? null : value ?? null;
}

/** Latest placements for foster display fallback (open preferred in resolveDisplayFoster). */
export const latestPlacementFosterSelect = {
  orderBy: [{ intakeDate: 'desc' }, { id: 'desc' }],
  take: 10,
  select: {
    id: true,
    fosterId: true,
    dischargeDate: true,
    foster: { select: { id: true, name: true, phone: true } },
  },
};

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
  thumbnailUrl: true,
  litterId: true,
  currentFosterId: true,
  isBondedPair: true,
  bondedWithKittenId: true,
  bondedWithName: true,
  isMedicalSpecialNeeds: true,
  litter: { select: { id: true, name: true } },
  currentFoster: { select: { id: true, name: true } },
  bondedWithKitten: { select: { id: true, name: true } },
  placements: {
    orderBy: [{ intakeDate: 'desc' }, { id: 'desc' }],
    take: 10,
    select: {
      id: true,
      fosterId: true,
      dischargeDate: true,
      foster: { select: { id: true, name: true } },
    },
  },
};

function pickLatestPlacement(placements = []) {
  if (!placements.length) return null;
  return placements.find((p) => p.dischargeDate == null) || placements[0];
}

/**
 * Prefer currentFoster; else fall back to open placement foster, else most
 * recent placement foster so Adopted/Released/etc. cats still show who last had them.
 */
export function resolveDisplayFoster(kitten) {
  if (kitten?.currentFoster) return kitten.currentFoster;
  const placement = pickLatestPlacement(kitten?.placements);
  if (placement?.foster) {
    return {
      id: placement.foster.id,
      name: placement.foster.name,
      phone: placement.foster.phone,
    };
  }
  return null;
}

export function serializeKittenForList(kitten) {
  const { placements, ...rest } = kitten;
  const latestPlacement = pickLatestPlacement(placements);
  const displayFoster = resolveDisplayFoster(kitten);
  return {
    ...rest,
    currentFoster: displayFoster,
    lastPlacementFoster: latestPlacement?.foster
      ? { id: latestPlacement.foster.id, name: latestPlacement.foster.name }
      : null,
    hasPrimaryPhoto: kitten.hasPrimaryPhoto ?? Boolean(kitten.primaryPhotoUrl),
    primaryPhotoUrl: stripInlineDataUrl(kitten.primaryPhotoUrl),
  };
}

export function serializeKittenForDetail(kitten) {
  if (!kitten) return kitten;

  const { placements, ...rest } = kitten;
  const latestPlacement = pickLatestPlacement(placements);
  const displayFoster = resolveDisplayFoster(kitten);

  return {
    ...rest,
    currentFoster: displayFoster,
    lastPlacementFoster: latestPlacement?.foster
      ? {
          id: latestPlacement.foster.id,
          name: latestPlacement.foster.name,
          phone: latestPlacement.foster.phone,
        }
      : null,
    hasPrimaryPhoto: kitten.hasPrimaryPhoto ?? Boolean(kitten.primaryPhotoUrl),
  };
}
