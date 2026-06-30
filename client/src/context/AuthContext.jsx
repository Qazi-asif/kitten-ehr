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
        setAuthSession({ token, user: current });
        setUser(current);
      } else {
        setUser(null);
      }
      return current;
    } catch {
      clearAuthSession();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    setAuthSession(data);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearAuthSession();
    setUser(null);
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
    [user, loading, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
