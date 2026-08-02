import { Linking } from 'react-native';
import { api } from '@/services/api';
import { WEB_APP_URL } from '@/services/env';
import { showDialog } from '@/store/ui.store';
import { storage } from '@/store/mmkv';
import { strings } from '@/i18n/strings';
import { paywallCopyFor } from '@/i18n/paywall-copy';
import { useSettingsStore } from '@/store/settings.store';

/**
 * "Upgrade on the web" flow. The app never sells anything itself: it trades the
 * signed-in user's JWT for a short-lived one-time code (POST /auth/web-handoff),
 * then opens the web app's /auth/callback in the system browser, which exchanges
 * the code and lands the user on /pricing already authenticated. Purchases
 * happen entirely on the web (Stripe). Only reachable when `payment_web_mobile`
 * is on — see webUpgradeEnabled() / paywall.ts.
 */

// Timestamp (ms) written before we hand off to the browser. On the next
// foreground App.tsx consumes it to reconcile Pro fast. Lives in MMKV (not
// module state) so it survives the app being killed while the user is in Safari.
const PENDING_KEY = 'checkout.pendingAt';
const PENDING_MAX_AGE_MS = 30 * 60_000;

export function setCheckoutPending(): void {
  storage.set(PENDING_KEY, Date.now());
}

/** Read-and-clear. Returns true only if a checkout was opened in the last 30 min. */
export function consumeCheckoutPending(): boolean {
  const at = storage.getNumber(PENDING_KEY);
  if (at === undefined) return false;
  storage.remove(PENDING_KEY);
  return Date.now() - at < PENDING_MAX_AGE_MS;
}

let inFlight = false;

export async function openWebUpgrade(source?: string): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const { data } = await api.post<{ code?: string; url?: string }>(
      '/auth/web-handoff',
      {},
      { suppressErrorModal: true },
    );

    // Prefer a server-composed URL if the endpoint ever returns one; otherwise
    // build the callback URL ourselves. `from=mobile` is what the web /pricing
    // page stashes to show a "Return to app" affordance after checkout.
    const next = `/pricing?from=mobile${source ? `&src=${source}` : ''}`;
    const url =
      data.url ??
      `${WEB_APP_URL}/auth/callback?code=${encodeURIComponent(
        data.code ?? '',
      )}&next=${encodeURIComponent(next)}`;

    setCheckoutPending(); // before openURL — the return foreground reads it
    await Linking.openURL(url);
  } catch {
    storage.remove(PENDING_KEY);
    const copy = paywallCopyFor(useSettingsStore.getState().contentLanguage);
    showDialog({
      title: copy.webOpenErrorTitle,
      message: copy.webOpenErrorBody,
      buttons: [{ text: strings.modals.ok, style: 'default' }],
    });
  } finally {
    inFlight = false;
  }
}
