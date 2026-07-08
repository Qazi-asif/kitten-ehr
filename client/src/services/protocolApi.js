import { adminFetch } from './api';

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchProtocols() {
  const response = await adminFetch('/protocols');
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load protocols'));
  return response.json();
}

export async function createProtocol(payload) {
  const response = await adminFetch('/protocols', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create protocol'));
  return response.json();
}

export async function fetchKittenActiveProtocols(kittenId) {
  const response = await adminFetch(`/kittens/${kittenId}/protocols`);
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load active protocols'));
  return response.json();
}

export async function fetchKittenProtocolDoses(kittenId) {
  const response = await adminFetch(`/kittens/${kittenId}/protocols/doses`);
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to load protocol doses'));
  return response.json();
}

export async function activateKittenProtocol(kittenId, payload) {
  const response = await adminFetch(`/kittens/${kittenId}/protocols/activate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to activate protocol'));
  return response.json();
}

export async function markProtocolDoseGiven(kittenId, doseId) {
  const response = await adminFetch(`/kittens/${kittenId}/protocols/doses/${doseId}`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to update dose'));
  return response.json();
}
