import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import { zustandStorage } from '@/store/mmkv';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Dark is the product default (the interview theme), not the system default.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'theme', storage: createJSONStorage(() => zustandStorage) },
  ),
);

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'system') return Appearance.getColorScheme() !== 'light';
  return mode === 'dark';
}
