import { create } from 'zustand';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authService } from '@/services/auth.service';
import { signInWithApple } from '@/lib/appleAuth';
import { tokenStorage } from '@/lib/tokenStorage';
import { toAppError } from '@/lib/api-error';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** True until tokenStorage.hydrate() + initial loadUser settle. */
  isBootstrapping: boolean;
  isLoading: boolean;
  error: string | null;
  /** Set after register when the account needs OTP email verification. */
  pendingVerificationEmail: string | null;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loadUser: () => Promise<void>;
  /** Poll /auth/me until the backend reflects Pro (after an IAP purchase). */
  reconcilePro: () => Promise<boolean>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,
  isLoading: false,
  error: null,
  pendingVerificationEmail: null,

  bootstrap: async () => {
    await tokenStorage.hydrate();
    if (tokenStorage.getAccessToken()) {
      try {
        const user = await authService.me();
        set({ user, isAuthenticated: true });
      } catch {
        // Expired session; the interceptor already tried a refresh.
        if (!tokenStorage.getAccessToken()) {
          set({ user: null, isAuthenticated: false });
        }
      }
    }
    set({ isBootstrapping: false });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(email, password);
      if (res.requiresVerification) {
        set({ pendingVerificationEmail: email, isLoading: false });
        return;
      }
      if (res.requires2FA || !res.accessToken) {
        set({
          error:
            'This account uses two-factor auth, which the mobile app doesn’t support yet — sign in with Google instead.',
          isLoading: false,
        });
        return;
      }
      tokenStorage.setTokens(res.accessToken, res.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: toAppError(e).message, isLoading: false });
      throw e;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(email, password, name);
      if (res.requiresVerification || !res.accessToken) {
        set({ pendingVerificationEmail: email, isLoading: false });
        return;
      }
      tokenStorage.setTokens(res.accessToken, res.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: toAppError(e).message, isLoading: false });
      throw e;
    }
  },

  verifyOtp: async (otp) => {
    const email = get().pendingVerificationEmail;
    if (!email) return;
    set({ isLoading: true, error: null });
    try {
      const res = await authService.verifyOtp(email, otp);
      tokenStorage.setTokens(res.accessToken, res.refreshToken);
      set({
        user: res.user,
        isAuthenticated: true,
        isLoading: false,
        pendingVerificationEmail: null,
      });
    } catch (e) {
      set({ error: toAppError(e).message, isLoading: false });
      throw e;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const result = await GoogleSignin.signIn();
      const idToken =
        result.type === 'success' ? result.data.idToken : null;
      if (!idToken) {
        set({ isLoading: false });
        return; // user cancelled
      }
      const res = await authService.googleMobile(idToken);
      tokenStorage.setTokens(res.accessToken, res.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: toAppError(e).message, isLoading: false });
      throw e;
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await signInWithApple();
      if (!result) {
        set({ isLoading: false });
        return; // user cancelled or no token issued
      }
      const res = await authService.appleMobile(
        result.identityToken,
        result.fullName,
      );
      tokenStorage.setTokens(res.accessToken, res.refreshToken);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: toAppError(e).message, isLoading: false });
      throw e;
    }
  },

  loadUser: async () => {
    try {
      const user = await authService.me();
      set({ user, isAuthenticated: true });
    } catch {
      if (!tokenStorage.getAccessToken()) {
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  reconcilePro: async () => {
    // The purchase is done in StoreKit, but Pro is server-driven — poll
    // /auth/me with backoff until the RevenueCat→backend webhook flips the
    // subscription row (~30s budget). Returns true as soon as Pro is seen.
    const delays = [0, 1500, 3000, 5000, 8000, 12000];
    for (const d of delays) {
      if (d) await new Promise<void>((r) => setTimeout(() => r(), d));
      await get().loadUser();
      if (selectIsPro(get())) return true;
    }
    return false; // webhook lagging — App foreground loadUser() will catch up
  },

  logout: () => {
    tokenStorage.clear();
    GoogleSignin.signOut().catch(() => undefined);
    // Cancel the local reminder and drop the daily cache. Lazy require avoids a
    // store↔service load cycle and tolerates the notifications module's absence.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@/services/notifications.service').cancelAllReminders?.();
    } catch {
      // notifications optional
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@/store/daily.store').useDailyStore.getState().clear();
    } catch {
      // daily store optional
    }
    set({ user: null, isAuthenticated: false, pendingVerificationEmail: null });
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.deleteAccount();
    } catch (e) {
      set({ isLoading: false, error: toAppError(e).message });
      throw e;
    }
    // Server-side account is gone — tear down the local session exactly like a
    // sign-out (clears tokens, Google session, reminders, daily cache, state).
    set({ isLoading: false });
    get().logout();
  },

  clearError: () => set({ error: null }),
}));

/** Pro when the shared web subscription row is ACTIVE on a paid plan. */
export function selectIsPro(state: Pick<AuthState, 'user'>): boolean {
  const sub = state.user?.subscription;
  return !!sub && sub.status === 'ACTIVE' && sub.planSlug !== 'free';
}

// A failed refresh clears tokens from the interceptor — reflect it in UI state.
tokenStorage.subscribe(() => {
  if (
    !tokenStorage.getAccessToken() &&
    useAuthStore.getState().isAuthenticated
  ) {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});

// Keep RevenueCat's identity in sync with the signed-in user. Fires on every
// path that sets `user` (login/register/verifyOtp/google/apple/bootstrap/
// loadUser) without editing each. appUserID = backend user.id so the
// RevenueCat→backend webhook maps a purchase to the right account. Lazy require
// avoids a store↔lib cycle and tolerates the SDK being unlinked.
let lastRcUserId: string | null = null;
useAuthStore.subscribe((state) => {
  const id = state.user?.id ?? null;
  if (id === lastRcUserId) return;
  lastRcUserId = id;
  try {
    const purchases = require('@/lib/purchases');
    if (id) void purchases.syncIdentity(id);
    else void purchases.logOut();
  } catch {
    // Purchases SDK unlinked — no-op.
  }
});
