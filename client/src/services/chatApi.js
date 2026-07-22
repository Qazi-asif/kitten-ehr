import { adminFetch } from './api';

async function readError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchChatMessages({ channelId = 'general', limit = 100, after = null } = {}) {
  const params = new URLSearchParams();
  params.set('channelId', channelId);
  params.set('limit', String(limit));
  if (after) params.set('after', after);

  const response = await adminFetch(`/chat/messages?${params}`);
  if (!response.ok) throw new Error(await readError(response, 'Failed to load chat messages'));
  return response.json();
}

export async function postChatMessage({ content, channelId = 'general' }) {
  const response = await adminFetch('/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ content, channelId }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to send message'));
  return response.json();
}

export async function fetchChatStaff() {
  const response = await adminFetch('/chat/staff');
  if (!response.ok) throw new Error(await readError(response, 'Failed to load staff list'));
  return response.json();
}

export function getStaffChatWsUrl(token) {
  const configured = import.meta.env.VITE_WS_URL?.trim();
  if (configured) {
    const url = new URL(configured, window.location.origin);
    url.searchParams.set('token', token);
    return url.toString();
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/staff-chat?token=${encodeURIComponent(token)}`;
}
