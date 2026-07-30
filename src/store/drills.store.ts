import { create } from 'zustand';
import { repService } from '@/services/rep.service';
import type { DrillRow, DrillsPayload, RepCategoryGroup } from '@/types';

/**
 * The all-drills catalog (AllDrillsScreen): group-filtered, paginated rows.
 * `fetch` resets to page 1 (focus / chip change); `loadMore` appends the next
 * page while `hasMore` — derived defensively for old backends without the flag.
 */

const PAGE_LIMIT = 30;

function payloadHasMore(payload: DrillsPayload): boolean {
  return payload.hasMore ?? payload.page * payload.limit < payload.total;
}

interface DrillsState {
  rows: DrillRow[];
  page: number;
  hasMore: boolean;
  freeDrillsRemainingToday: number | null;
  group: 'all' | RepCategoryGroup;
  isLoading: boolean;
  error: string | null;
  setGroup: (group: 'all' | RepCategoryGroup) => void;
  /** Load (or refresh) page 1, replacing the list. */
  fetch: () => Promise<void>;
  /** Append the next page; no-op while loading or when exhausted. */
  loadMore: () => Promise<void>;
}

export const useDrillsStore = create<DrillsState>((set, get) => ({
  rows: [],
  page: 1,
  hasMore: false,
  freeDrillsRemainingToday: null,
  group: 'all',
  isLoading: false,
  error: null,

  setGroup: (group) => {
    set({ group, rows: [], page: 1, hasMore: false });
    void get().fetch();
  },

  fetch: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const payload = await repService.getDrills({
        group: get().group,
        page: 1,
        limit: PAGE_LIMIT,
      });
      set({
        rows: payload.questions,
        page: payload.page ?? 1,
        hasMore: payloadHasMore(payload),
        freeDrillsRemainingToday: payload.freeDrillsRemainingToday,
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load',
      });
    }
  },

  loadMore: async () => {
    const { isLoading, hasMore, page, group, rows } = get();
    if (isLoading || !hasMore) return;
    set({ isLoading: true });
    try {
      const payload = await repService.getDrills({
        group,
        page: page + 1,
        limit: PAGE_LIMIT,
      });
      set({
        rows: [...rows, ...payload.questions],
        page: payload.page ?? page + 1,
        hasMore: payloadHasMore(payload),
        freeDrillsRemainingToday: payload.freeDrillsRemainingToday,
        isLoading: false,
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load',
      });
    }
  },
}));
