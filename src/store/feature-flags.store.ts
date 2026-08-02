import { create } from 'zustand';
import { api } from '@/services/api';

/**
 * Client mirror of the web app's feature-flag store (frontend
 * src/store/feature-flags.store.ts). Flags come from the PUBLIC GET
 * /feature-flags endpoint; `isEnabled` is fail-closed (false until a live fetch
 * lands), so a fresh install or an offline start shows nothing flag-gated.
 *
 * Deliberately NOT persisted to MMKV: the whole point of `payment_web_mobile`
 * is that flipping it OFF server-side (for an App Store re-review) instantly
 * re-hides the upgrade CTA. A cached `true` surviving a cold start could defeat
 * that, so every launch re-fetches from scratch.
 */

export const FLAGS = {
  /** Master payments switch — the web /pricing route is gated on this too. */
  subscription: 'subscription',
  /** Mobile-only: show the "Upgrade on the web" CTA. */
  webMobileCheckout: 'payment_web_mobile',
} as const;

interface FeatureFlag {
  key: string;
  enabled: boolean;
  label: string;
  category: string;
}

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  loaded: boolean;
  fetchFlags: () => Promise<void>;
  isEnabled: (key: string) => boolean;
}

// Concurrent callers (bootstrap + first foreground) share one request.
let inFlight: Promise<void> | null = null;

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: {},
  loaded: false,

  fetchFlags: () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        // suppressErrorModal: a cold-start flag fetch must never pop the offline
        // modal — failure just leaves everything fail-closed (all-false).
        const { data } = await api.get<FeatureFlag[]>('/feature-flags', {
          suppressErrorModal: true,
        });
        const flags: Record<string, boolean> = {};
        for (const f of data) flags[f.key] = f.enabled;
        set({ flags, loaded: true });
      } catch {
        set({ loaded: true });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  isEnabled: (key: string) => {
    const { flags, loaded } = get();
    if (!loaded) return false; // fail-closed until flags load
    return flags[key] ?? false;
  },
}));

/**
 * The mobile upgrade CTA is shown only when BOTH the master `subscription` flag
 * and `payment_web_mobile` are on. Requiring the master flag guarantees the web
 * /pricing page (itself gated on `subscription`) is actually reachable, so the
 * CTA can never point at a hidden page. Plain function so non-React callers
 * (paywall.ts) can read it too.
 */
export function webUpgradeEnabled(): boolean {
  const { isEnabled } = useFeatureFlagsStore.getState();
  return isEnabled(FLAGS.subscription) && isEnabled(FLAGS.webMobileCheckout);
}
