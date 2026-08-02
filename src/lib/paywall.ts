import { navigationRef } from '@/app/navigation/navigationRef';
import { useUiStore, showDialog } from '@/store/ui.store';
import { strings } from '@/i18n/strings';
import * as purchases from '@/lib/purchases';
import { webUpgradeEnabled } from '@/store/feature-flags.store';
import { openWebUpgrade } from '@/lib/webCheckout';
import { paywallCopyFor } from '@/i18n/paywall-copy';
import { useSettingsStore } from '@/store/settings.store';
import type { RootStackParamList } from '@/app/navigation/types';

/**
 * The single entry point for showing "you need Pro". Every trigger site (the
 * journey pro-gate, the Home upsell, and the API interceptor's UPGRADE_REQUIRED)
 * calls this so degradation is decided in ONE place:
 *   - IAP available            → the real PaywallScreen (buy in-app) — dead code
 *     today (SDK not installed), kept for a possible future IAP return.
 *   - web upgrade flag ON       → an upgrade dialog with "Continue on the web"
 *     (opens the web checkout in the system browser).
 *   - otherwise                → today's neutral soft dialog (ModalHost), never
 *     a dead-end. This is the ONLY state visible during Apple review — keep it
 *     byte-identical (no prices, no external-purchase mention).
 * Safe to call from non-React code (the axios interceptor) via navigationRef.
 */
export function presentPaywall(
  source?: NonNullable<RootStackParamList['Paywall']>['source'],
  message: string = strings.modals.paywallBody,
): void {
  if (purchases.isAvailable() && navigationRef.isReady()) {
    navigationRef.navigate('Paywall', source ? { source } : undefined);
    return;
  }

  if (webUpgradeEnabled()) {
    const copy = paywallCopyFor(useSettingsStore.getState().contentLanguage);
    showDialog({
      title: copy.webUpgradeTitle,
      message: copy.webUpgradeBody,
      mood: 'meditating',
      buttons: [
        {
          text: copy.webUpgradeCta,
          style: 'default',
          onPress: () => void openWebUpgrade(source),
        },
        { text: copy.notNow, style: 'cancel' },
      ],
    });
    return;
  }

  useUiStore.getState().show({ type: 'paywall', message });
}
