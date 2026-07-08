import { adminFetch } from './api';

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchWishlists(ownerType, ownerId) {
  const params = new URLSearchParams({
    ownerType,
    ownerId: String(ownerId),
  });
  const response = await adminFetch(`/wishlists?${params.toString()}`);
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load wishlists'));
  return response.json();
}

export async function createWishlist(payload) {
  const response = await adminFetch('/wishlists', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to save wishlist'));
  return response.json();
}

export async function deleteWishlist(id) {
  const response = await adminFetch(`/wishlists/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to delete wishlist'));
}
