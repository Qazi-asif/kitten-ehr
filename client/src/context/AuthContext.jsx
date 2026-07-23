import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  fetchCurrentUser,
  getAuthToken,
  getStoredUser,
  loginRequest,
  setAuthSession,
} from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const current = await fetchCurrentUser();
      if (current) {
        setUser(current);
      } else if (!getAuthToken()) {
        // Token was rejected and cleared (401/403).
        setUser(null);
      }
      // Network blip with token still present: keep the cached user.
      return current || getStoredUser();
    } catch {
      return getStoredUser();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const failSafe = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(failSafe);
  }, [refreshUser]);

  async function login(email, password, remember = true) {
    const data = await loginRequest(email, password);
    setAuthSession({ token: data.token, user: data.user, remember });
    setUser(data.user);
    setLoading(false);
    return data.user;
  }

  function hasPermission(key) {
    return user?.permissions?.includes(key) ?? false;
  }

  function hasAnyPermission(keys) {
    return keys.some((key) => hasPermission(key));
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      hasPermission,
      hasAnyPermission,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
