const API_BASE = '/api';
const TOKEN_KEY = 'pt_auth_token';
const USER_KEY = 'pt_auth_user';
const REMEMBER_KEY = 'pt_auth_remember';

function readToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function readUserRaw() {
  return localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
}

/** Migrate legacy sessionStorage-only sessions into localStorage (multi-tab). */
function migrateLegacySessionStorage() {
  const sessionToken = sessionStorage.getItem(TOKEN_KEY);
  if (!sessionToken) return;
  if (!localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, sessionToken);
    const sessionUser = sessionStorage.getItem(USER_KEY);
    if (sessionUser) localStorage.setItem(USER_KEY, sessionUser);
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getAuthToken() {
  migrateLegacySessionStorage();
  return readToken();
}

export function isRememberMeEnabled() {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

export function getStoredUser() {
  migrateLegacySessionStorage();
  if (!readToken()) return null;

  const raw = readUserRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession({ token, user, remember = true }) {
  // Always persist in localStorage so every tab in this browser shares the
  // session. sessionStorage is per-tab and caused surprise logouts when
  // opening another admin tab.
  clearAuthSession();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
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
  const contentType = response.headers.get('content-type') || '';
  try {
    data = await response.json();
  } catch {
    if (!contentType.includes('application/json')) {
      throw new Error(
        response.status >= 500
          ? 'Login server error. Ensure the API is running and JWT_SECRET is set in server/.env.'
          : 'Login server returned an invalid response. Is the API running on port 5000?',
      );
    }
    throw new Error('Unexpected response from login server');
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Login failed');
    if (data.portalLoginUrl) error.portalLoginUrl = data.portalLoginUrl;
    throw error;
  }

  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  // Stay signed in through brief offline / flaky network moments. Only a real
  // auth rejection (401/403) should wipe the session.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return getStoredUser();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      clearAuthSession();
      return null;
    }

    if (!response.ok) {
      return getStoredUser();
    }

    const user = await response.json();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return getStoredUser();
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

export async function deleteUser(id) {
  const response = await authFetch(`/users/${id}`, { method: 'DELETE' });
  if (response.status === 204) return;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to delete user');
  return data;
}

/** @deprecated Prefer deleteUser — soft-deactivate was replaced by hard delete. */
export async function deactivateUser(id) {
  return deleteUser(id);
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
