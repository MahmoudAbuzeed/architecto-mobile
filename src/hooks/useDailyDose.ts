import { useDailyStore } from '@/store/daily.store';
import { useTracksStore } from '@/store/tracks.store';
import { todayLocalISO } from '@/lib/dates';

/**
 * A read-only view of "today's node" derived from the daily-dose cache
 * ([[daily.store]]), for the journey path + TrackOverview. The daily dose is
 * the free user's one session/day AND the next uncompleted topic in the
 * PRIMARY track, so this tells the Learn screens which node to highlight and
 * whether it's already spent.
 *
 * Everything degrades to null/false when the cache is stale (not today), the
 * backend is too old to serve the dose (`unsupported`), the track is finished
 * (`track_complete`), the payload is for a non-primary track, or the backend
 * returned `topic: null` — so callers never have to special-case those.
 */
export interface DailyDose {
  todaySlug: string | null;
  todayCategory: string | null;
  todayCategoryName: string | null;
  todayTitle: string | null;
  /** True once today's dose is done (global — one session/day, any track). */
  doseCompleted: boolean;
  streakCurrent: number;
  trackComplete: boolean;
  isFresh: boolean;
  unsupported: boolean;
}

export function useDailyDose(): DailyDose {
  const daily = useDailyStore((s) => s.daily);
  const fetchedFor = useDailyStore((s) => s.fetchedFor);
  const unsupported = useDailyStore((s) => s.unsupported);
  const primaryTrack = useTracksStore((s) => s.tracks?.primaryTrack);

  const isFresh = fetchedFor?.date === todayLocalISO();
  // Only trust the dose when it's fresh, supported, and for the primary track
  // (the dose is primary-track-only; another track's categories must not light
  // up a today node).
  const usable =
    !!isFresh && !unsupported && !!daily && daily.track === primaryTrack;

  const trackComplete = usable && daily!.status === 'track_complete';
  const doseCompleted = usable && daily!.status === 'completed';
  // Guard the backend's `topic: null` ternary (topic row gone).
  const topic = usable ? daily!.topic : null;

  return {
    todaySlug: topic?.slug ?? null,
    todayCategory: topic?.category ?? null,
    todayCategoryName: topic?.categoryName ?? null,
    todayTitle: topic?.title ?? null,
    doseCompleted,
    streakCurrent: daily?.streak.current ?? 0,
    trackComplete,
    isFresh: !!isFresh,
    unsupported,
  };
}
