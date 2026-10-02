import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until the initial session restore has finished.
  const [loading, setLoading] = useState(true);

  // Restore the session on page load from the httpOnly refresh cookie. This
  // also completes social login, which returns with only that cookie set.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((session) => !cancelled && setUser(session.user))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    setSessionExpiredHandler(() => setUser(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(({ data }) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback((credentials) => authApi.login(credentials).then(startSession), [startSession]);
  const register = useCallback((details) => authApi.register(details).then(startSession), [startSession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
