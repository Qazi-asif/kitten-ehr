import { getFileUrl } from '../services/api';

const LEGACY_UPLOAD_PATTERN = /^\/uploads\/(.+)\.(jpg|jpeg|png|webp|gif)$/i;

const KITTEN_FALLBACKS = {
  biscuit: '/images/kittens/no-photo.svg',
  gravy: '/images/kittens/no-photo.svg',
  nugget: '/images/kittens/no-photo.svg',
  pumpkin: '/images/kittens/no-photo.svg',
};

const GENERIC_FALLBACK = '/images/kittens/no-photo.svg';

function isResolvablePhotoUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  if (url.startsWith('/images/')) return true;
  if (url.startsWith('/uploads/')) return true;
  // Server-side image-proxy endpoint (e.g. /api/public/kittens/25/photo) -
  // used in place of inline base64 in public API responses.
  if (url.startsWith('/api/public/')) return true;
  return false;
}

function normalizePhotoUrl(url, kittenName = '', { allowNameFallback = false } = {}) {
  if (url && isResolvablePhotoUrl(url)) {
    return url;
  }

  if (url) {
    const legacyMatch = url.match(LEGACY_UPLOAD_PATTERN);
    if (legacyMatch && allowNameFallback) {
      const fallback = KITTEN_FALLBACKS[legacyMatch[1].toLowerCase()];
      if (fallback) return fallback;
    }
  }

  if (allowNameFallback) {
    const nameKey = kittenName?.trim().toLowerCase();
    if (nameKey && KITTEN_FALLBACKS[nameKey]) {
      return KITTEN_FALLBACKS[nameKey];
    }
  }

  return null;
}

export function resolvePrimaryPhotoUrl({ primaryPhotoUrl, photos, name, hasPrimaryPhoto } = {}, options = {}) {
  const normalizedPrimary = normalizePhotoUrl(primaryPhotoUrl, name, options);
  if (normalizedPrimary) return normalizedPrimary;

  const primaryDoc = photos?.find((photo) => photo.isPrimaryPhoto);
  if (primaryDoc?.fileUrl) return primaryDoc.fileUrl;

  const firstPhoto = photos?.[0]?.fileUrl;
  if (firstPhoto) return firstPhoto;

  if (hasPrimaryPhoto) return null;

  return null;
}

export function getKittenImageUrl(kitten, { allowFallback = false } = {}) {
  const resolved = normalizePhotoUrl(kitten?.primaryPhotoUrl, kitten?.name, {
    allowNameFallback: allowFallback,
  });
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

