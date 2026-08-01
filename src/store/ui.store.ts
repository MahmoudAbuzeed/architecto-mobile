import { create } from 'zustand';
import type { AppError } from '@/lib/api-error';
import type { ArchieMood } from '@/components/ArchieCircle';

/**
 * Global modal host state. The api interceptor routes coded backend errors
 * here; ModalHost (mounted once in App.tsx) renders whatever is active. The
 * `dialog` variant is our themed replacement for native Alert.alert — see
 * showDialog below.
 */

/** A dialog button, mirroring the shape of a native Alert button. */
export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export type AppModal =
  | { type: 'paywall'; message: string }
  | { type: 'ai-unavailable'; message: string }
  | { type: 'rate-limit'; message: string }
  | { type: 'offline'; message: string }
  | { type: 'generic'; message: string }
  | {
      type: 'dialog';
      title: string;
      message?: string;
      buttons: DialogButton[];
      mood?: ArchieMood;
    };

interface UiState {
  activeModal: AppModal | null;
  show: (modal: AppModal) => void;
  dismiss: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  show: (modal) => set({ activeModal: modal }),
  dismiss: () => set({ activeModal: null }),
}));

/**
 * Imperative helper mirroring Alert.alert — call it from anywhere (render or
 * not, e.g. usePreventRemove callbacks) to surface a themed confirm dialog
 * instead of a stock OS alert.
 */
export function showDialog(config: {
  title: string;
  message?: string;
  buttons: DialogButton[];
  mood?: ArchieMood;
}): void {
  useUiStore.getState().show({ type: 'dialog', ...config });
}

/**
 * Map a normalized error onto a modal. Paywall and AI-outage always surface
 * (they are conversion/incident moments, exactly like the web); everything
 * else respects the caller's suppress flag so screens can render inline
 * error states instead.
 */
export function routeErrorToModal(
  error: AppError,
  opts: { suppress?: boolean } = {},
): void {
  const { show } = useUiStore.getState();

  if (error.code === 'UPGRADE_REQUIRED') {
    // Prefer the real paywall screen (in-app purchase) when the SDK is linked;
    // fall back to the soft dialog. Lazy require avoids a store↔lib/nav cycle.
    try {
      require('@/lib/paywall').presentPaywall('interceptor', error.message);
    } catch {
      show({ type: 'paywall', message: error.message });
    }
    return;
  }
  if (error.code === 'AI_UNAVAILABLE') {
    show({ type: 'ai-unavailable', message: error.message });
    return;
  }

  if (opts.suppress) return;

  // Flow-specific codes are always handled inline by their screens.
  if (
    error.code === 'REP_ALREADY_COMPLETED' ||
    error.code === 'FOLLOW_UP_ALREADY_ANSWERED'
  ) {
    return;
  }

  if (error.isNetwork) {
    show({ type: 'offline', message: error.message });
    return;
  }
  if (error.status === 429) {
    show({
      type: 'rate-limit',
      message:
        error.message || 'Easy there — give it a few seconds and try again.',
    });
    return;
  }
  if (error.status === 401) return; // handled by the auth flow
  show({ type: 'generic', message: error.message });
}
