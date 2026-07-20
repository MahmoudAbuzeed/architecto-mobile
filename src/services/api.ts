import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './env';
import { tokenStorage } from '@/lib/tokenStorage';
import { toAppError } from '@/lib/api-error';

/**
 * Axios instance mirroring the web app's services/api.ts interceptors, with
 * two mobile deltas: single-flight 401 refresh (rotating refresh tokens make
 * the web's per-request _retry flag racy) and modal routing through the
 * ui.store host instead of toasts.
 */

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip the global error-modal routing; caller renders errors inline. */
    suppressErrorModal?: boolean;
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/google/mobile'];

function isAuthPath(url?: string): boolean {
  return !!url && AUTH_PATHS.some((p) => url.includes(p));
}

// Single-flight refresh: concurrent 401s share one refresh request. With
// rotation, a second parallel refresh would burn the new token and log the
// user out.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) return null;
      try {
        const { data } = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        tokenStorage.setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        tokenStorage.clear();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = (error.config ?? {}) as AxiosRequestConfig;
    const status = error.response?.status;

    // Transparent refresh-and-retry, once, never for auth endpoints.
    if (status === 401 && !config._retry && !isAuthPath(config.url)) {
      config._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` };
        return api.request(config);
      }
      // Refresh failed → session is over. auth.store reacts via tokenStorage
      // subscription; also route to the modal host below.
    }

    const appError = toAppError(error);

    // Paywall / outage routing always fires (matches web behavior); other
    // errors respect suppressErrorModal. Dynamic import breaks the
    // api ↔ store require cycle.
    const { routeErrorToModal } = await import('@/store/ui.store');
    routeErrorToModal(appError, {
      suppress: config.suppressErrorModal === true,
    });

    return Promise.reject(appError);
  },
);
