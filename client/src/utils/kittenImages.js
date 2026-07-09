import { getFileUrl } from '../services/api';

const LEGACY_UPLOAD_PATTERN = /^\/uploads\/(.+)\.(jpg|jpeg|png|webp|gif)$/i;

const KITTEN_FALLBACKS = {
  biscuit: '/images/kittens/cute.png',
  gravy: '/images/kittens/vect.jpg',
  nugget: '/images/kittens/cato.png',
  pumpkin: '/images/kittens/cato.png',
};

const GENERIC_FALLBACK = '/images/kittens/cute.png';

function isResolvablePhotoUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  if (url.startsWith('/images/')) return true;
  if (url.startsWith('/uploads/')) return true;
  return false;
}

function normalizePhotoUrl(url, kittenName = '') {
  if (url && isResolvablePhotoUrl(url)) {
    return url;
  }

  if (url) {
    const legacyMatch = url.match(LEGACY_UPLOAD_PATTERN);
    if (legacyMatch) {
      const fallback = KITTEN_FALLBACKS[legacyMatch[1].toLowerCase()];
      if (fallback) return fallback;
    }
  }

  const nameKey = kittenName?.trim().toLowerCase();
  if (nameKey && KITTEN_FALLBACKS[nameKey]) {
    return KITTEN_FALLBACKS[nameKey];
  }

  return null;
}

export function resolvePrimaryPhotoUrl({ primaryPhotoUrl, photos, name } = {}) {
  const normalizedPrimary = normalizePhotoUrl(primaryPhotoUrl, name);
  if (normalizedPrimary) return normalizedPrimary;

  const primaryDoc = photos?.find((photo) => photo.isPrimaryPhoto);
  if (primaryDoc?.fileUrl) return primaryDoc.fileUrl;

  return photos?.[0]?.fileUrl ?? null;
}

export function getKittenImageUrl(kitten, { allowFallback = false } = {}) {
  const resolved = normalizePhotoUrl(kitten?.primaryPhotoUrl, kitten?.name);
  if (resolved) {
    return getFileUrl(resolved);
  }

  if (!allowFallback) {
    return null;
  }

  return GENERIC_FALLBACK;
}

export function getKittenFallbackImageUrl(kitten) {
  const name = kitten?.name?.toLowerCase();
  if (name && KITTEN_FALLBACKS[name]) {
    return KITTEN_FALLBACKS[name];
  }
  return GENERIC_FALLBACK;
}

export function formatKittenAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (months < 1) return 'Under 1 month';
  if (months === 1) return '1 month old';
  if (months < 12) return `${months} months old`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year old' : `${years} years old`;
}
