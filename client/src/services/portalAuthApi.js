// Foster Portal session handling - deliberately isolated from authApi.js /
// AuthContext.jsx. Those are wired to poll GET /api/auth/me on every app
// mount (via AuthContext's refreshUser), and that endpoint's requireAuth
// middleware explicitly 403s any Foster Portal account (role.isPortalRole).
// Sharing storage keys or the staff AuthContext would mean a portal session
// gets silently wiped the moment refreshUser fires - it runs unconditionally
// for every route since AuthProvider wraps the whole app. Using separate
// storage keys means the staff auth layer never even sees a portal token,
// so that codepath never runs against it. No /api/auth/me-equivalent exists
// for portal accounts yet (out of scope here), so there is no rehydration
// call to make - the session is just what the login response gave us.

const API_BASE = '/api';
const TOKEN_KEY = 'pt_portal_token';
const USER_KEY = 'pt_portal_user';
const REMEMBER_KEY = 'pt_portal_remember';

export function getPortalAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getStoredPortalUser() {
  if (!getPortalAuthToken()) return null;

  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearPortalAuthSession();
    return null;
  }
}

export function setPortalAuthSession({ token, user, remember = false }) {
  clearPortalAuthSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, '1');
  }
}

export function clearPortalAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

// Same shared endpoint staff use (POST /api/auth/login) - portal and staff
// accounts are both User rows differentiated by role.isPortalRole, so there
// is one login path per the existing auth design. Only session storage
// diverges after this call returns.
export async function portalLoginRequest(email, password) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // flow: 'portal' tells the shared /auth/login endpoint which frontend
      // this request came from, so it can apply the isPortalRole check in
      // the correct direction. See authController.js's login().
      body: JSON.stringify({ email, password, flow: 'portal' }),
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
          ? 'Login server error. Please try again shortly.'
          : 'Login server returned an invalid response.',
      );
    }
    throw new Error('Unexpected response from login server');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

export async function portalSetPasswordRequest(token, password) {
  let response;
  try {
    response = await fetch(`${API_BASE}/portal/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
  } catch {
    throw new Error('Cannot reach the API server. Check your internet connection and try again.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw new Error('Unexpected response from server');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set password');
  }

  return data;
}
