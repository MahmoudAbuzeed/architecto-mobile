import { create } from 'zustand';
import { learnService } from '@/services/learn.service';
import type { TopicRow } from '@/types';

/**
 * Per-category topic lists from `/learn/topics?category=` (the web's single
 * source of truth for locked/available/completed). In-memory only — statuses
 * shift with progress, so a stale MMKV copy would lie.
 */
interface TopicsState {
  byCategory: Record<string, TopicRow[]>;
  loading: Record<string, boolean>;
  error: string | null;
  fetch: (category: string) => Promise<void>;
}

export const useTopicsStore = create<TopicsState>((set, get) => ({
  byCategory: {},
  loading: {},
  error: null,

  fetch: async (category) => {
    if (get().loading[category]) return;
    set((s) => ({ loading: { ...s.loading, [category]: true }, error: null }));
    try {
      const topics = await learnService.getTopics(category);
      set((s) => ({
        byCategory: { ...s.byCategory, [category]: topics },
        loading: { ...s.loading, [category]: false },
      }));
    } catch (e) {
      set((s) => ({
        loading: { ...s.loading, [category]: false },
        error: e instanceof Error ? e.message : 'Failed to load',
      }));
    }
  },
}));
