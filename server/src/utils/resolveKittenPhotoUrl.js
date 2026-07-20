const LEGACY_UPLOAD_PATTERN = /^\/uploads\/(.+)\.(jpg|jpeg|png|webp|gif)$/i;

export const KITTEN_NAME_PHOTO_FALLBACKS = {
  biscuit: '/images/kittens/no-photo.svg',
  gravy: '/images/kittens/no-photo.svg',
  nugget: '/images/kittens/no-photo.svg',
  pumpkin: '/images/kittens/no-photo.svg',
};

export const GENERIC_KITTEN_PHOTO_FALLBACK = '/images/kittens/no-photo.svg';

export function isResolvablePhotoUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  if (url.startsWith('/images/')) return true;
  if (url.startsWith('/uploads/')) return true;
  return false;
}

export function normalizeKittenPhotoUrl(url, kittenName = '') {
  if (url && isResolvablePhotoUrl(url)) {
    return url;
  }

  if (url) {
    const legacyMatch = url.match(LEGACY_UPLOAD_PATTERN);
    if (legacyMatch) {
      const fallback = KITTEN_NAME_PHOTO_FALLBACKS[legacyMatch[1].toLowerCase()];
      if (fallback) return fallback;
    }
  }

  const nameKey = kittenName?.trim().toLowerCase();
  if (nameKey && KITTEN_NAME_PHOTO_FALLBACKS[nameKey]) {
    return KITTEN_NAME_PHOTO_FALLBACKS[nameKey];
  }

  return null;
}
