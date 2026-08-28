import { adminFetch } from './api';
import { WISHLIST_OWNER_TYPES } from '../constants/wishlists';

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function wishlistPath(ownerType, ownerId) {
  if (ownerType === WISHLIST_OWNER_TYPES.FOSTER) {
    return `/fosters/${ownerId}/wishlists`;
  }
  if (ownerType === WISHLIST_OWNER_TYPES.KITTEN) {
    return `/kittens/${ownerId}/wishlists`;
  }
  const params = new URLSearchParams({
    ownerType,
    ownerId: String(ownerId),
  });
  return `/wishlists?${params.toString()}`;
}

export async function fetchWishlists(ownerType, ownerId) {
  const response = await adminFetch(wishlistPath(ownerType, ownerId));
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load wishlists'));
  return response.json();
}

export async function createWishlist(payload) {
  const { ownerType, ownerId, ...body } = payload;
  const path = ownerType === WISHLIST_OWNER_TYPES.FOSTER || ownerType === WISHLIST_OWNER_TYPES.KITTEN
    ? wishlistPath(ownerType, ownerId)
    : '/wishlists';

  const response = await adminFetch(path, {
    method: 'POST',
    body: JSON.stringify(
      ownerType === WISHLIST_OWNER_TYPES.FOSTER || ownerType === WISHLIST_OWNER_TYPES.KITTEN
        ? body
        : payload,
    ),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to save wishlist'));
  return response.json();
}

export async function deleteWishlist(id) {
  const response = await adminFetch(`/wishlists/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to delete wishlist'));
}

/** CR-109: rename a named wishlist, moving all of its retailer links. */
export async function renameWishlistGroup({ ownerType, ownerId, from, to }) {
  const response = await adminFetch('/wishlists/groups/rename', {
    method: 'PATCH',
    body: JSON.stringify({ ownerType, ownerId, from, to }),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to rename wishlist'));
  return response.json();
}

/** CR-109: delete a named wishlist and every link inside it. */
export async function deleteWishlistGroup({ ownerType, ownerId, groupName }) {
  const params = new URLSearchParams({
    ownerType,
    ownerId: String(ownerId),
    groupName,
  });
  const response = await adminFetch(`/wishlists/groups?${params.toString()}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to delete wishlist'));
  return response.json();
}

export { groupWishlists } from '../constants/wishlists';
