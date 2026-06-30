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
  const response = await publicFetch('/public/applications', {
    method: 'POST',
    body: JSON.stringify({ type, formData: JSON.stringify(formData) }),
  });
  if (!response.ok) throw new Error('Failed to submit application');
  return response.json();
}
