import { create } from 'zustand';
import { repService } from '@/services/rep.service';
import { toAppError } from '@/lib/api-error';
import { useHomeStore } from './home.store';
import type { GradingResponse, InputMode, SubmitAnswerBody } from '@/types';

/**
 * State machine for one rep session (RepSessionScreen). A single screen owns
 * the whole loop so the audio session, countdown, and transcript survive
 * voice ↔ typed mode switches without navigator teardown.
 */

export type RepPhase = 'asking' | 'recording' | 'typing' | 'submitting' | 'done';

export interface RepTarget {
  /** null = today's daily rep; a slug = a drill. */
  drillSlug: string | null;
  title: string;
  prompt: string;
  /** Countdown budget in seconds (from estimatedSeconds, capped for UI). */
  budgetSeconds: number;
}

interface RepState {
  target: RepTarget | null;
  phase: RepPhase;
  transcript: string;
  typedDraft: string;
  startedAt: number | null;
  result: GradingResponse | null;
  error: string | null;
  /** Set when the daily rep 409s — the screen re-fetches home and shows it. */
  alreadyCompleted: boolean;

  begin: (target: RepTarget) => void;
  setPhase: (phase: RepPhase) => void;
  setTranscript: (t: string) => void;
  setTypedDraft: (t: string) => void;
  submit: (text: string, inputMode: InputMode, language?: string) => Promise<void>;
  reset: () => void;
}

const initial = {
  target: null,
  phase: 'asking' as RepPhase,
  transcript: '',
  typedDraft: '',
  startedAt: null,
  result: null,
  error: null,
  alreadyCompleted: false,
};

export const useRepStore = create<RepState>((set, get) => ({
  ...initial,

  begin: (target) =>
    set({ ...initial, target, phase: 'asking', startedAt: Date.now() }),

  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setTypedDraft: (typedDraft) => set({ typedDraft }),

  submit: async (text, inputMode, language) => {
    const { target, startedAt, phase } = get();
    if (!target || phase === 'submitting') return;
    const trimmed = text.trim();
    if (!trimmed) return;

    set({ phase: 'submitting', error: null });
    const body: SubmitAnswerBody = {
      transcript: trimmed.slice(0, 8000),
      inputMode,
      language,
      durationSeconds: startedAt
        ? Math.min(3600, Math.round((Date.now() - startedAt) / 1000))
        : undefined,
    };

    try {
      const result = target.drillSlug
        ? await repService.submitDrillAnswer(target.drillSlug, body)
        : await repService.submitDailyAnswer(body);
      set({ result, phase: 'done' });
      // Home is now stale (streak/XP/attempt) — refresh in the background.
      void useHomeStore.getState().fetch();
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'REP_ALREADY_COMPLETED') {
        set({ alreadyCompleted: true, phase: 'done' });
        void useHomeStore.getState().fetch();
        return;
      }
      // Recoverable: keep the transcript, return to the previous input mode.
      set({
        error: err.message,
        phase: inputMode === 'typed' ? 'typing' : 'asking',
      });
    }
  },

  reset: () => set({ ...initial }),
}));
