const API_BASE = '/api';
const TOKEN_KEY = 'pt_auth_token';
const USER_KEY = 'pt_auth_user';
const REMEMBER_KEY = 'pt_auth_remember';

function getSessionStorage() {
  return sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : null;
}

function getPersistentStorage() {
  return localStorage.getItem(TOKEN_KEY) ? localStorage : null;
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function isRememberMeEnabled() {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

export function getStoredUser() {
  if (!getAuthToken()) {
    return null;
  }

  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession({ token, user, remember = false }) {
  clearAuthSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, '1');
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export async function loginRequest(email, password) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Cannot reach the API server. Check your internet connection and try again.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw new Error('Unexpected response from login server');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    clearAuthSession();
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      clearAuthSession();
      return null;
    }

    const user = await response.json();
    const storage = getSessionStorage() || getPersistentStorage() || localStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    clearAuthSession();
    return null;
  }
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
