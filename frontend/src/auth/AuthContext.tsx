import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { apiClient, TOKEN_STORAGE_KEY } from '@/api/client';
import { decodeAccessToken, type AccessTokenPayload } from '@/lib/jwt';

const USERNAME_STORAGE_KEY = 'username';

export interface AuthState {
  token: string | null;
  payload: AccessTokenPayload | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

function loadInitialToken(): { token: string | null; payload: AccessTokenPayload | null } {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return { token: null, payload: null };
  try {
    return { token, payload: decodeAccessToken(token) };
  } catch {
    return { token: null, payload: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = loadInitialToken();
  const [token, setToken] = useState<string | null>(initial.token);
  const [payload, setPayload] = useState<AccessTokenPayload | null>(initial.payload);
  const [username, setUsername] = useState<string | null>(localStorage.getItem(USERNAME_STORAGE_KEY));

  const login = useCallback(async (usernameInput: string, password: string) => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/login', {
      username: usernameInput,
      password,
    });
    const accessToken = response.data.accessToken;
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(USERNAME_STORAGE_KEY, usernameInput);
    setToken(accessToken);
    setPayload(decodeAccessToken(accessToken));
    setUsername(usernameInput);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    setToken(null);
    setPayload(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ token, payload, username, login, logout }),
    [token, payload, username, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
