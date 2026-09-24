import axios from 'axios';
import { toast } from '@/components/ui/toast';
import { errorCodeToI18nKey, extractErrorCode } from '@/lib/error-codes';
import i18n from '@/i18n';

export const TOKEN_STORAGE_KEY = 'accessToken';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat this as an expired session (and force a redirect) if a
    // token existed before this request. A login attempt has no token yet,
    // so a 401 there is a normal invalid-credentials response that the
    // login form should catch and display, not a session expiry.
    const hadToken = !!localStorage.getItem(TOKEN_STORAGE_KEY);
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = '/login';
    } else if (error.response?.status !== 401) {
      const key = errorCodeToI18nKey(extractErrorCode(error));
      toast.add({ type: 'error', description: i18n.t(key) });
    }
    return Promise.reject(error);
  },
);
