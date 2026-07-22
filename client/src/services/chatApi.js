import { adminFetch } from './api';

async function readError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchConversations() {
  const response = await adminFetch('/chat/conversations');
  if (!response.ok) throw new Error(await readError(response, 'Failed to load conversations'));
  return response.json();
}

export async function createDirectConversation(userId) {
  const response = await adminFetch('/chat/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to start chat'));
  return response.json();
}

export async function createGroupConversation({ name, memberIds }) {
  const response = await adminFetch('/chat/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to create group'));
  return response.json();
}

export async function fetchChatMessages(conversationId, { limit = 100, after = null } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (after) params.set('after', after);
  const response = await adminFetch(`/chat/conversations/${conversationId}/messages?${params}`);
  if (!response.ok) throw new Error(await readError(response, 'Failed to load messages'));
  return response.json();
}

export async function postChatMessage(conversationId, content) {
  const response = await adminFetch(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to send message'));
  return response.json();
}

export async function markChatRead(conversationId) {
  const response = await adminFetch(`/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to mark read'));
  return response.json();
}

export async function clearChatConversation(conversationId) {
  const response = await adminFetch(`/chat/conversations/${conversationId}/clear`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to clear chat'));
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
