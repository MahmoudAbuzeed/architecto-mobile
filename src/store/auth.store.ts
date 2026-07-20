import { create } from 'zustand';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authService } from '@/services/auth.service';
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
  loadUser: () => Promise<void>;
  logout: () => void;
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
      if (res.requiresVerification) {
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

  logout: () => {
    tokenStorage.clear();
    GoogleSignin.signOut().catch(() => undefined);
    set({ user: null, isAuthenticated: false, pendingVerificationEmail: null });
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
