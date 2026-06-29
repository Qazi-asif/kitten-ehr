const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';
const TOKEN_KEY = 'pt_auth_token';
const USER_KEY = 'pt_auth_user';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginRequest(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  return response.json();
}

export async function authFetch(path, options = {}) {
  const token = getAuthToken();
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

export function fetchUsers() {
  return authFetch('/users').then(async (r) => {
    if (!r.ok) throw new Error('Failed to load users');
    return r.json();
  });
}

export async function createUser(payload) {
  const response = await authFetch('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create user');
  return data;
}

export async function updateUser(id, payload) {
  const response = await authFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update user');
  return data;
}

export async function deactivateUser(id) {
  const response = await authFetch(`/users/${id}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to deactivate user');
  return data;
}

export function fetchRoles() {
  return authFetch('/roles').then(async (r) => {
    if (!r.ok) throw new Error('Failed to load roles');
    return r.json();
  });
}

export function fetchPermissions() {
  return authFetch('/roles/permissions').then(async (r) => {
    if (!r.ok) throw new Error('Failed to load permissions');
    return r.json();
  });
}

export async function createRole(payload) {
  const response = await authFetch('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create role');
  return data;
}

export async function updateRole(id, payload) {
  const response = await authFetch(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update role');
  return data;
}

export async function deleteRole(id) {
  const response = await authFetch(`/roles/${id}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete role');
  return data;
}
