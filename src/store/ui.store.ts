import { create } from 'zustand';
import type { AppError } from '@/lib/api-error';

/**
 * Global modal host state. The api interceptor routes coded backend errors
 * here; ModalHost (mounted once in App.tsx) renders whatever is active.
 */

export type AppModal =
  | { type: 'paywall'; message: string }
  | { type: 'ai-unavailable'; message: string }
  | { type: 'rate-limit'; message: string }
  | { type: 'offline'; message: string }
  | { type: 'generic'; message: string };

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
    show({ type: 'paywall', message: error.message });
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
