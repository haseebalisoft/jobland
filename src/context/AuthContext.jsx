import { createContext, useContext, useEffect, useState } from 'react';
import api, { setAccessToken, getAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/me');
        setUser(me.data);
      } catch (e) {
        try {
          const res = await api.post('/auth/refresh-token');
          setAccessToken(res.data.accessToken);
          const me = await api.get('/auth/me');
          setUser(me.data);
        } catch {
          // Don't overwrite user with null – they may have just logged in while startup requests were in flight
          setUser((prev) => prev);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(
        new CustomEvent('hirdlogic-extension-auth', {
          detail: { token: getAccessToken() || null, user: user || null },
        }),
      );
    } catch {
      /* ignore */
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

