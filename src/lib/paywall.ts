import { navigationRef } from '@/app/navigation/navigationRef';
import { useUiStore } from '@/store/ui.store';
import { strings } from '@/i18n/strings';
import * as purchases from '@/lib/purchases';
import type { RootStackParamList } from '@/app/navigation/types';

/**
 * The single entry point for showing "you need Pro". Every trigger site (the
 * journey pro-gate, the Home upsell, and the API interceptor's UPGRADE_REQUIRED)
 * calls this so degradation is decided in ONE place:
 *   - IAP available  → the real PaywallScreen (buy in-app)
 *   - otherwise      → today's neutral soft dialog (ModalHost), never a dead-end
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
  useUiStore.getState().show({ type: 'paywall', message });
}
