import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import { repService } from '@/services/rep.service';
import type { HomePayload } from '@/types';

/**
 * Home payload cache. The last payload persists to MMKV so a warm launch
 * paints instantly, then refreshes on focus.
 */
interface HomeState {
  home: HomePayload | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  clear: () => void;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      home: null,
      isLoading: false,
      error: null,

      fetch: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const home = await repService.getHome();
          set({ home, isLoading: false });
        } catch (e) {
          set({
            isLoading: false,
            error: e instanceof Error ? e.message : 'Failed to load',
          });
        }
      },

      clear: () => set({ home: null, error: null }),
    }),
    {
      name: 'home-cache',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ home: s.home }) as HomeState,
    },
  ),
);
