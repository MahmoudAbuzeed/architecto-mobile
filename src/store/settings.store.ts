import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './mmkv';
import type { ContentLanguage } from '@/lib/languages';

/**
 * Content-language split (per plan): UI chrome stays English; contentLanguage
 * drives the API `language` param, the STT locale, TTS lang, and per-block
 * RTL styling. I18nManager is never flipped.
 */
interface SettingsState {
  contentLanguage: ContentLanguage;
  setContentLanguage: (lang: ContentLanguage) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      contentLanguage: 'en',
      setContentLanguage: (contentLanguage) => set({ contentLanguage }),
    }),
    { name: 'settings', storage: createJSONStorage(() => zustandStorage) },
  ),
);
