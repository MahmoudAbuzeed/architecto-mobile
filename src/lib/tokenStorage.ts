import * as Keychain from 'react-native-keychain';

/**
 * Token store — same interface as the web app's lib/tokenStorage.ts but backed
 * by the iOS Keychain / Android Keystore instead of localStorage. An in-memory
 * cache serves synchronous reads (the axios request interceptor); writes
 * persist to the Keychain asynchronously. Call hydrate() once at app start
 * before anything makes an authenticated request.
 */

const SERVICE = 'com.architecto.mobile.auth';

interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
}

let cache: Tokens = { accessToken: null, refreshToken: null };
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const tokenStorage = {
  async hydrate(): Promise<void> {
    if (hydrated) return;
    try {
      const creds = await Keychain.getGenericPassword({ service: SERVICE });
      if (creds) {
        const parsed = JSON.parse(creds.password) as Tokens;
        cache = {
          accessToken: parsed.accessToken ?? null,
          refreshToken: parsed.refreshToken ?? null,
        };
      }
    } catch {
      // Unreadable keychain entry — treat as signed out.
      cache = { accessToken: null, refreshToken: null };
    }
    hydrated = true;
    notify();
  },

  getAccessToken(): string | null {
    return cache.accessToken;
  },

  getRefreshToken(): string | null {
    return cache.refreshToken;
  },

  setTokens(accessToken: string, refreshToken: string): void {
    cache = { accessToken, refreshToken };
    notify();
    Keychain.setGenericPassword('tokens', JSON.stringify(cache), {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    }).catch(() => undefined);
  },

  clear(): void {
    cache = { accessToken: null, refreshToken: null };
    notify();
    Keychain.resetGenericPassword({ service: SERVICE }).catch(() => undefined);
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
