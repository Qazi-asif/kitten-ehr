import { getFileUrl } from '../services/api';

const KITTEN_FALLBACKS = {
  biscuit: '/images/kittens/biscuit.jpg',
  gravy: '/images/kittens/gravy.jpg',
  nugget: '/images/kittens/nugget.jpg',
  pumpkin: '/images/kittens/nugget.jpg',
};

export function getKittenImageUrl(kitten, { allowFallback = false } = {}) {
  if (kitten?.primaryPhotoUrl) {
    return getFileUrl(kitten.primaryPhotoUrl);
  }

  if (!allowFallback) {
    return null;
  }

  const name = kitten?.name?.toLowerCase();
  if (name && KITTEN_FALLBACKS[name]) {
    return KITTEN_FALLBACKS[name];
  }

  return '/images/kittens/biscuit.jpg';
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
