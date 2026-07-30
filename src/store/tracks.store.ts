import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { learnService } from '@/services/learn.service';
import { useHomeStore } from './home.store';
import type { TrackDetail, TracksPayload } from '@/types';

/**
 * Tracks catalog cache. Like home-cache, the payloads persist to MMKV so the
 * Learn tab warm-paints instantly, then refreshes on focus.
 */
interface TracksState {
  tracks: TracksPayload | null;
  /** Detail for the primary track (TrackOverview). */
  detail: TrackDetail | null;
  isLoading: boolean;
  error: string | null;
  fetchTracks: () => Promise<void>;
  fetchDetail: (track: string) => Promise<void>;
  /** Set the primary track, then refresh tracks + detail + Home + daily. */
  selectTrack: (slug: string) => Promise<void>;
  /** Add a track to additionalTracks so it appears on Home; no-op if open. */
  startTrack: (slug: string) => Promise<void>;
}

// Refresh the daily hero after a track change. Lazy require breaks the
// tracks.store ↔ daily.store cycle (daily.store reads tracks for the primary).
function refreshDaily(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useDailyStore } = require('./daily.store');
    void useDailyStore.getState().fetch({ force: true });
  } catch {
    // daily store optional
  }
}

export const useTracksStore = create<TracksState>()(
  persist(
    (set, get) => ({
      tracks: null,
      detail: null,
      isLoading: false,
      error: null,

      fetchTracks: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const tracks = await learnService.getTracks();
          set({ tracks, isLoading: false });
        } catch (e) {
          set({
            isLoading: false,
            error: e instanceof Error ? e.message : 'Failed to load',
          });
        }
      },

      fetchDetail: async (track) => {
        try {
          const detail = await learnService.getTrackDetail(track);
          set({ detail });
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Failed to load' });
        }
      },

      selectTrack: async (slug) => {
        await learnService.setPrimaryTrack(slug);
        // A track can't be both primary and additional — drop it from the
        // additional list server-side if it was there.
        const current = get().tracks;
        if (current?.additionalTracks.includes(slug)) {
          const nextAdditional = current.additionalTracks.filter(
            (t) => t !== slug,
          );
          await learnService
            .setAdditionalTracks(nextAdditional)
            .catch(() => undefined);
        }
        // Optimistic flip so the picker checkmark moves instantly.
        set((s) => ({
          tracks: s.tracks
            ? {
                ...s.tracks,
                primaryTrack: slug,
                additionalTracks: s.tracks.additionalTracks.filter(
                  (t) => t !== slug,
                ),
              }
            : s.tracks,
          error: null,
        }));
        await Promise.all([get().fetchTracks(), get().fetchDetail(slug)]);
        // Home's continueTrack + the daily hero are stale now.
        void useHomeStore.getState().fetch();
        refreshDaily();
      },

      startTrack: async (slug) => {
        const current = get().tracks;
        if (!current) return;
        if (current.primaryTrack === slug || current.additionalTracks.includes(slug)) {
          return; // already open
        }
        const nextAdditional = [...current.additionalTracks, slug];
        // Optimistic: add to additionalTracks + flip the summary flag.
        set((s) => ({
          tracks: s.tracks
            ? {
                ...s.tracks,
                additionalTracks: nextAdditional,
                tracks: s.tracks.tracks.map((t) =>
                  t.track === slug ? { ...t, isAdditional: true } : t,
                ),
              }
            : s.tracks,
          error: null,
        }));
        try {
          await learnService.setAdditionalTracks(nextAdditional);
          await get().fetchTracks();
          void useHomeStore.getState().fetch();
        } catch (e) {
          // Roll back the optimistic add.
          set((s) => ({
            tracks: s.tracks
              ? {
                  ...s.tracks,
                  additionalTracks: current.additionalTracks,
                  tracks: s.tracks.tracks.map((t) =>
                    t.track === slug ? { ...t, isAdditional: false } : t,
                  ),
                }
              : s.tracks,
          }));
          throw e;
        }
      },
    }),
    {
      name: 'tracks-cache',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ tracks: s.tracks, detail: s.detail }) as TracksState,
      version: 1,
      migrate: (persisted) => persisted as TracksState,
    },
  ),
);
