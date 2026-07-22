import { getPortalAuthToken } from './portalAuthApi';

const API_BASE = '/api/portal';

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

// Same shape as authApi.js's authFetch, but reads the portal-scoped token
// (getPortalAuthToken, from portalAuthApi.js) instead of the staff one -
// keeps portal data requests on the same isolated session as portal login,
// per the design established for PortalProtectedRoute.
async function portalFetch(path, options = {}) {
  const token = getPortalAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function fetchMyProfile() {
  const response = await portalFetch('/me');
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load your profile'));
  return response.json();
}

export async function updateMyProfile(data) {
  const response = await portalFetch('/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to update your profile'));
  return response.json();
}

export async function fetchMyPlacements() {
  const response = await portalFetch('/placements');
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load your placements'));
  return response.json();
}

export async function fetchMyKittenDocuments(kittenId) {
  const response = await portalFetch(`/kittens/${kittenId}/documents`);
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load documents'));
  return response.json();
}

export async function uploadMyKittenDocument(kittenId, { file, docType, description }) {
  const formData = new FormData();
  formData.append('file', file);
  if (docType) formData.append('docType', docType);
  if (description) formData.append('description', description);

  const response = await portalFetch(`/kittens/${kittenId}/documents`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to upload document'));
  return response.json();
}
