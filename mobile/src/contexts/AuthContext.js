import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { fetchMe, loginUser, registerUser, updateMe, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'vybe_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  };

  // Wire the axios 401 interceptor to call logout so expired tokens auto-clear
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          const me = await fetchMe(stored);
          setToken(stored);
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { access_token } = await loginUser(email, password);
    const me = await fetchMe(access_token);
    await SecureStore.setItemAsync(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(me);
  };

  const register = async (email, password, displayName) => {
    const { access_token } = await registerUser(email, password, displayName);
    const me = await fetchMe(access_token);
    await SecureStore.setItemAsync(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(me);
  };

  const updateUser = async (displayName) => {
    const updated = await updateMe(token, displayName);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
