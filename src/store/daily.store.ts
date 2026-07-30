import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { learnService } from '@/services/learn.service';
import { useTracksStore } from './tracks.store';
import { useHomeStore } from './home.store';
import { useSettingsStore } from './settings.store';
import { toAppError } from '@/lib/api-error';
import { todayLocalISO } from '@/lib/dates';
import type { DailyLessonPayload, DailySubmitResponse } from '@/types';

/**
 * Today's micro-lesson cache. Like home-cache, the payload persists to MMKV so
 * a warm launch (and offline) paints the lesson instantly, then refreshes.
 * `fetchedFor` is the staleness key: a payload fetched yesterday, for another
 * track, or in another content-language is refetched.
 */
interface DailyState {
  daily: DailyLessonPayload | null;
  fetchedFor: { date: string; track: string; language: string } | null;
  isLoading: boolean;
  error: string | null;
  /** True after a 404 — the backend predates the daily feature; hero hides. */
  unsupported: boolean;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  submit: (answers: Record<string, number>) => Promise<DailySubmitResponse>;
  clear: () => void;
}

// Monotonic request token: a later fetch supersedes an in-flight earlier one,
// so a slow response for a track the user already switched away from can never
// overwrite a newer result. Lives in the store factory closure (per store).
let fetchSeq = 0;

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      daily: null,
      fetchedFor: null,
      isLoading: false,
      error: null,
      unsupported: false,

      fetch: async (opts) => {
        const force = opts?.force ?? false;
        // Dedupe concurrent NON-force fetches (rapid re-focus). A force refetch
        // (track switch, post-submit) must NOT be dropped by an in-flight
        // non-force fetch — the seq guard below keeps the result consistent.
        if (!force && get().isLoading) return;
        const track =
          useTracksStore.getState().tracks?.primaryTrack ?? get().daily?.track;
        if (!track) return; // no track yet — nothing to fetch
        const language = useSettingsStore.getState().contentLanguage;
        const today = todayLocalISO();

        // Skip the network when the cached payload already matches today/track/lang.
        const ff = get().fetchedFor;
        if (
          !force &&
          ff &&
          ff.date === today &&
          ff.track === track &&
          ff.language === language
        ) {
          return;
        }

        const mySeq = ++fetchSeq;
        set({ isLoading: true, error: null });
        try {
          const daily = await learnService.getDaily(track, language);
          if (mySeq !== fetchSeq) return; // superseded by a newer fetch
          set({
            daily,
            fetchedFor: { date: today, track, language },
            isLoading: false,
            unsupported: false,
          });
        } catch (e) {
          if (mySeq !== fetchSeq) return; // superseded — ignore this outcome
          const err = toAppError(e);
          if (err.status === 404) {
            // Old backend: hide the hero, don't surface an error.
            set({ isLoading: false, unsupported: true });
            return;
          }
          // Keep the stale payload (warm-paint / offline); just note the error.
          set({ isLoading: false, error: err.message });
        }
      },

      submit: async (answers) => {
        const daily = get().daily;
        if (!daily?.topic) {
          throw new Error('No lesson to submit.');
        }
        const res = await learnService.submitDaily({
          track: daily.track,
          topicSlug: daily.topic.slug,
          answers,
        });
        // Patch the cached payload to the completed state so Home + the lesson
        // screen reflect it without a refetch.
        set({
          daily: {
            ...daily,
            status: 'completed',
            attempt: {
              score: res.score,
              total: res.total,
              completedAt: new Date().toISOString(),
            },
            streak: {
              current: res.streak.current,
              longest: res.streak.longest,
              doneToday: true,
            },
          },
        });
        // Home's continue/streak blocks are stale; the reminder should move to
        // tomorrow.
        void useHomeStore.getState().fetch();
        // notifications.service imports daily.store → lazy require breaks the
        // cycle (and tolerates the module being absent on old builds).
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const notifications = require('@/services/notifications.service');
          void notifications.syncDailyReminder?.();
        } catch {
          // reminders are optional — never block a submit
        }
        return res;
      },

      clear: () =>
        set({
          daily: null,
          fetchedFor: null,
          error: null,
          unsupported: false,
        }),
    }),
    {
      name: 'daily-cache',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) =>
        ({ daily: s.daily, fetchedFor: s.fetchedFor }) as DailyState,
      version: 1,
      migrate: (persisted) => persisted as DailyState,
    },
  ),
);
