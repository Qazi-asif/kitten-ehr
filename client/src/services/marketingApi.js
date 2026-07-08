import { adminFetch } from './api';

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchSocialPosts(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await adminFetch(`/social-posts${query}`);
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load social posts'));
  return response.json();
}

export async function createMarketingPost(payload) {
  const response = await adminFetch('/social-posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create social post'));
  return response.json();
}
