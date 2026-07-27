import { publicFetch } from './api.js';
import { cachedRequest, invalidateCache } from '../utils/apiCache.js';

const PUBLIC_CACHE_TTL_MS = 60_000;

async function publicRequest(path) {
  return cachedRequest(`public:${path}`, async (signal) => {
    const response = await publicFetch(`/public${path}`, { signal });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }, PUBLIC_CACHE_TTL_MS);
}

export function fetchPublicKittens(limit, options = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (options.featured) params.set('featured', '1');
  const query = params.toString() ? `?${params.toString()}` : '';
  return publicRequest(`/kittens${query}`);
}

export function fetchPublicKittenById(id) {
  return publicRequest(`/kittens/${id}`);
}

export function fetchPublicKittenUpdates(id) {
  return publicRequest(`/kittens/${id}/updates`);
}

export function fetchPublicStats() {
  return publicRequest('/stats');
}

export function fetchPublicContent(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return publicRequest(`/content${query}`);
}

export function fetchPublicWishlists(ownerType, ownerId) {
  if (ownerType === 'KITTEN') {
    return publicRequest(`/kittens/${ownerId}/wishlists`);
  }
  const params = new URLSearchParams({
    ownerType,
    ownerId: String(ownerId),
  });
  return publicRequest(`/wishlists?${params.toString()}`);
}

export function fetchPublicArticle(slug) {
  return publicRequest(`/content/${slug}`);
}

export function fetchPublicEvents() {
  return publicRequest('/events');
}

export function fetchPublicEventBySlug(slug) {
  return publicRequest(`/events/${slug}`);
}

export function invalidatePublicSettingsCache() {
  invalidateCache('public:/settings');
}

export function fetchPublicSettings() {
  return publicRequest('/settings');
}

export async function submitApplication(type, formData, photos = [], kittenId) {
  const kittenOfInterest = formData.kittenOfInterest || formData.kittenInterest || '';

  async function throwIfFailed(response) {
    if (response.ok) return response.json();
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Failed to submit application (${response.status})`);
  }

  if (photos.length > 0) {
    const body = new FormData();
    body.append('type', type);
    body.append('formData', JSON.stringify(formData));
    if (kittenOfInterest) body.append('kittenOfInterest', kittenOfInterest);
    if (kittenId) body.append('kittenId', String(kittenId));
    photos.slice(0, 3).forEach((file) => body.append('photos', file));

    const response = await publicFetch('/public/applications', {
      method: 'POST',
      body,
    });
    return throwIfFailed(response);
  }

  const response = await publicFetch('/public/applications', {
    method: 'POST',
    body: JSON.stringify({
      type,
      formData: JSON.stringify(formData),
      kittenOfInterest: kittenOfInterest || undefined,
      kittenId: kittenId || undefined,
    }),
  });
  return throwIfFailed(response);
}

export async function submitDonation(data) {
  const response = await publicFetch('/public/donations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to submit donation');
  }
  return response.json();
}

export async function submitContact(data) {
  const response = await publicFetch('/public/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to send message');
  }
  return payload;
}
