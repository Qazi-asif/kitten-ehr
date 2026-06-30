import { publicFetch } from './api.js';

async function publicRequest(path) {
  const response = await publicFetch(`/public${path}`);
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

export function fetchPublicKittens() {
  return publicRequest('/kittens');
}

export function fetchPublicKittenById(id) {
  return publicRequest(`/kittens/${id}`);
}

export function fetchPublicKittenPhotos(id) {
  return publicRequest(`/kittens/${id}/photos`);
}

export function fetchPublicKittenUpdates(id) {
  return publicRequest(`/kittens/${id}/updates`);
}

export function fetchPublicStats() {
  return publicRequest('/stats');
}

export function fetchPublicContent() {
  return publicRequest('/content');
}

export function fetchPublicArticle(slug) {
  return publicRequest(`/content/${slug}`);
}

export function fetchPublicEvents() {
  return publicRequest('/events');
}

export async function fetchPublicSettings() {
  return publicRequest('/settings');
}

export async function submitApplication(type, formData) {
  const kittenOfInterest = formData.kittenOfInterest || formData.kittenInterest || '';
  const response = await publicFetch('/public/applications', {
    method: 'POST',
    body: JSON.stringify({
      type,
      formData: JSON.stringify(formData),
      kittenOfInterest: kittenOfInterest || undefined,
    }),
  });
  if (!response.ok) throw new Error('Failed to submit application');
  return response.json();
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
