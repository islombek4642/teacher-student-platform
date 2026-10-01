import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient, TOKEN_STORAGE_KEY } from '@/api/client';
import { decodeAccessToken, type AccessTokenPayload } from '@/lib/jwt';

const USERNAME_STORAGE_KEY = 'username';
const FULLNAME_STORAGE_KEY = 'fullName';

export interface AuthState {
  token: string | null;
  payload: AccessTokenPayload | null;
  username: string | null;
  fullName: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

function getFullNameFromPayload(payload: AccessTokenPayload | null): string | null {
  if (!payload) return null;
  const parts = [payload.firstName, payload.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

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
  const [fullName, setFullName] = useState<string | null>(
    () => getFullNameFromPayload(initial.payload) || localStorage.getItem(FULLNAME_STORAGE_KEY)
  );

  // Sync latest user profile (firstName & lastName) from backend if token exists
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    apiClient
      .get<{ firstName?: string | null; lastName?: string | null; username: string }>('/auth/me')
      .then((res) => {
        if (!isMounted) return;
        const parts = [res.data.firstName, res.data.lastName].filter(Boolean);
        const name = parts.length > 0 ? parts.join(' ') : res.data.username;
        setFullName(name);
        localStorage.setItem(FULLNAME_STORAGE_KEY, name);
      })
      .catch(() => {
        // Fallback to token payload or username if offline or error
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async (usernameInput: string, password: string) => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/login', {
      username: usernameInput,
      password,
    });
    const accessToken = response.data.accessToken;
    const decoded = decodeAccessToken(accessToken);
    const calculatedName = getFullNameFromPayload(decoded) || usernameInput;

    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(USERNAME_STORAGE_KEY, usernameInput);
    localStorage.setItem(FULLNAME_STORAGE_KEY, calculatedName);

    setToken(accessToken);
    setPayload(decoded);
    setUsername(usernameInput);
    setFullName(calculatedName);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    localStorage.removeItem(FULLNAME_STORAGE_KEY);
    setToken(null);
    setPayload(null);
    setUsername(null);
    setFullName(null);
  }, []);

  const value = useMemo(
    () => ({ token, payload, username, fullName, login, logout }),
    [token, payload, username, fullName, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
