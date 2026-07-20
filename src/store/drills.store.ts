import { create } from 'zustand';
import { repService } from '@/services/rep.service';
import type { DrillsPayload, RepCategoryGroup } from '@/types';

interface DrillsState {
  payload: DrillsPayload | null;
  group: 'all' | RepCategoryGroup;
  isLoading: boolean;
  error: string | null;
  setGroup: (group: 'all' | RepCategoryGroup) => void;
  fetch: () => Promise<void>;
}

export const useDrillsStore = create<DrillsState>((set, get) => ({
  payload: null,
  group: 'all',
  isLoading: false,
  error: null,

  setGroup: (group) => {
    set({ group });
    void get().fetch();
  },

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const payload = await repService.getDrills({
        group: get().group,
        limit: 100,
      });
      set({ payload, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load',
      });
    }
  },
}));
