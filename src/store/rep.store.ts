import { create } from 'zustand';
import { repService } from '@/services/rep.service';
import { toAppError } from '@/lib/api-error';
import { useHomeStore } from './home.store';
import type {
  GradingResponse,
  InputMode,
  ProbeQuestion,
  ProbeResponse,
  SubmitAnswerBody,
} from '@/types';

/**
 * State machine for one rep session (RepSessionScreen). A single screen owns
 * the whole loop so the audio session, countdown, and transcript survive
 * voice ↔ typed mode switches without navigator teardown.
 *
 * Probing sessions (plan C2): `turn` is orthogonal to `phase` — the same
 * asking/recording/typing loop runs again per follow-up probe. `result` is
 * only ever the FINAL grading; the first main-turn response parks in
 * `initial` until the backend (or `finalizeLocal`) closes the session.
 */

export type RepPhase = 'asking' | 'recording' | 'typing' | 'submitting' | 'done';

export type RepTurn =
  | { kind: 'main' }
  | {
      kind: 'probe';
      probe: ProbeQuestion;
      attemptId: string;
      /** 1-based display position (derived from probesUsed, not probe.index). */
      number: number;
      total: number;
    };

export interface RepTarget {
  /** null = today's daily rep; a slug = a drill. */
  drillSlug: string | null;
  title: string;
  prompt: string;
  /** Countdown budget in seconds (REP_BUDGET_SECONDS). */
  budgetSeconds: number;
}

interface RepState {
  target: RepTarget | null;
  phase: RepPhase;
  turn: RepTurn;
  transcript: string;
  typedDraft: string;
  startedAt: number | null;
  /** Main-turn grading, held while probes run; merged into `result` at the end. */
  initial: GradingResponse | null;
  /** XP accumulated across answered probes (excludes the initial award). */
  probeXp: number;
  /** Live coverage for the "SO FAR" strip while probing. */
  provisional: { covered: string[]; missed: string[] } | null;
  /** The FINAL grading — set only when the session is done. */
  result: GradingResponse | null;
  error: string | null;
  /** Set when the daily rep 409s — the screen re-fetches home and shows it. */
  alreadyCompleted: boolean;

  begin: (target: RepTarget) => void;
  setPhase: (phase: RepPhase) => void;
  setTranscript: (t: string) => void;
  setTypedDraft: (t: string) => void;
  submit: (text: string, inputMode: InputMode, language?: string) => Promise<void>;
  /**
   * Promote what we already have (initial grading + probe XP + provisional
   * coverage) to the final result — used by "Grade what I have" and budget
   * expiry mid-probing. The server finalizes lazily on its own TTL.
   */
  finalizeLocal: () => void;
  reset: () => void;
}

const initialState = {
  target: null,
  phase: 'asking' as RepPhase,
  turn: { kind: 'main' } as RepTurn,
  transcript: '',
  typedDraft: '',
  startedAt: null,
  initial: null,
  probeXp: 0,
  provisional: null,
  result: null,
  error: null,
  alreadyCompleted: false,
};

/** Probe-flow codes that mean "this session is over" — finalize with what we have. */
const PROBE_TERMINAL_CODES = [
  'REP_SESSION_COMPLETE',
  'REP_SESSION_EXPIRED',
  'PROBE_ALREADY_ANSWERED',
];

export const useRepStore = create<RepState>((set, get) => ({
  ...initialState,

  begin: (target) =>
    set({ ...initialState, target, phase: 'asking', startedAt: Date.now() }),

  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setTypedDraft: (typedDraft) => set({ typedDraft }),

  submit: async (text, inputMode, language) => {
    const { target, startedAt, phase, turn } = get();
    if (!target || phase === 'submitting') return;
    const trimmed = text.trim();
    if (!trimmed) return;

    set({ phase: 'submitting', error: null });

    // ── Probe turn → /rep/attempts/:id/probe ─────────────────────────────
    if (turn.kind === 'probe') {
      try {
        const res = await repService.submitProbe(turn.attemptId, {
          transcript: trimmed.slice(0, 8000),
          inputMode,
          language,
        });
        applyProbeResponse(res, turn, set, get);
      } catch (e) {
        const err = toAppError(e);
        if (err.code && PROBE_TERMINAL_CODES.includes(err.code)) {
          get().finalizeLocal();
          return;
        }
        if (err.code === 'REP_ALREADY_COMPLETED') {
          set({ alreadyCompleted: true, phase: 'done' });
          void useHomeStore.getState().fetch();
          return;
        }
        // Recoverable: keep the transcript, return to the prior input mode.
        set({
          error: err.message,
          phase: inputMode === 'typed' ? 'typing' : 'asking',
        });
      }
      return;
    }

    // ── Main turn → daily/drill answer (always opts into probing) ────────
    const body: SubmitAnswerBody = {
      transcript: trimmed.slice(0, 8000),
      inputMode,
      language,
      durationSeconds: startedAt
        ? Math.min(3600, Math.round((Date.now() - startedAt) / 1000))
        : undefined,
      probing: true,
    };

    try {
      const result = target.drillSlug
        ? await repService.submitDrillAnswer(target.drillSlug, body)
        : await repService.submitDailyAnswer(body);

      if (result.session?.status === 'probing' && result.session.probe) {
        set({
          initial: result,
          provisional: {
            covered: [...result.covered],
            missed: [...result.missed],
          },
          turn: {
            kind: 'probe',
            probe: result.session.probe,
            attemptId: result.attemptId,
            number: result.session.probesUsed + 1,
            total: result.session.maxProbes,
          },
          transcript: '',
          typedDraft: '',
          phase: 'asking',
        });
      } else {
        // No session key (old backend) or status 'complete' → done, as today.
        set({ result, phase: 'done' });
      }
      // XP/streak/DailyRep are awarded on the first answer either way —
      // Home is stale now; refresh in the background.
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

  finalizeLocal: () => {
    const { initial, provisional, probeXp, phase } = get();
    if (!initial || phase === 'done') return;
    const result: GradingResponse = {
      ...initial,
      covered: provisional?.covered ?? initial.covered,
      missed: provisional?.missed ?? initial.missed,
      xpEarned: initial.xpEarned + probeXp,
      followUp: null,
      session: undefined,
    };
    set({ result, phase: 'done' });
  },

  reset: () => set({ ...initialState }),
}));

/** Shared probe-response reducer (kept outside the store body for clarity). */
function applyProbeResponse(
  res: ProbeResponse,
  turn: Extract<RepTurn, { kind: 'probe' }>,
  set: (partial: Partial<RepState>) => void,
  get: () => RepState,
): void {
  const { initial, provisional, probeXp } = get();
  const earned = probeXp + (res.xpEarned ?? 0);

  // Update provisional coverage: prefer the server's remainingGaps, else
  // move the addressed targetGap from missed → covered ourselves.
  let covered = provisional?.covered ?? [];
  let missed = provisional?.missed ?? [];
  if (res.final?.remainingGaps) {
    const remaining = res.final.remainingGaps;
    covered = [...covered, ...missed.filter((m) => !remaining.includes(m))];
    missed = remaining;
  } else if (res.addressed) {
    missed = missed.filter((m) => m !== turn.probe.targetGap);
    covered = [...covered, turn.probe.targetGap];
  }

  if (res.session?.status === 'probing' && res.session.probe) {
    set({
      probeXp: earned,
      provisional: { covered, missed },
      turn: {
        kind: 'probe',
        probe: res.session.probe,
        attemptId: turn.attemptId,
        number: res.session.probesUsed + 1,
        total: res.session.maxProbes,
      },
      transcript: '',
      typedDraft: '',
      phase: 'asking',
    });
    return;
  }

  // Session complete (or a defensive fallback when the probe is missing):
  // merge — final score/label/verdict override the initial grading, XP sums
  // across every turn, and the follow-up card never shows for probing runs.
  const base = initial;
  if (!base) {
    // Shouldn't happen (probe turns imply an initial), but never strand the UI.
    set({ phase: 'done' });
    return;
  }
  const final = res.final;
  const result: GradingResponse = {
    ...base,
    score: final?.score ?? base.score,
    scoreLabel: final?.scoreLabel ?? base.scoreLabel,
    verdict: final?.verdict ?? base.verdict,
    covered,
    missed,
    xpEarned: base.xpEarned + earned + (final?.bonusXp ?? 0),
    levelProgress: res.levelProgress ?? base.levelProgress,
    followUp: null,
    session: undefined,
  };
  set({ probeXp: earned, result, phase: 'done' });
  void useHomeStore.getState().fetch();
}
