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
  /** True once the mic explainer ran and permissions were primed. */
  micPrimed: boolean;
  setMicPrimed: (primed: boolean) => void;
  // ── Daily reminder (local notifications) ──────────────────────────
  /** User opted into the daily reminder (and granted OS permission). */
  remindersEnabled: boolean;
  setRemindersEnabled: (v: boolean) => void;
  /** Local hour (0–23) the reminder fires; synced with the backend pref. */
  reminderHour: number;
  setReminderHour: (h: number) => void;
  /** True once the reminder prime prompt has been shown (first-run). */
  reminderPrimed: boolean;
  setReminderPrimed: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      contentLanguage: 'en',
      setContentLanguage: (contentLanguage) => set({ contentLanguage }),
      micPrimed: false,
      setMicPrimed: (micPrimed) => set({ micPrimed }),
      remindersEnabled: false,
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
      reminderHour: 9,
      setReminderHour: (reminderHour) => set({ reminderHour }),
      reminderPrimed: false,
      setReminderPrimed: (reminderPrimed) => set({ reminderPrimed }),
    }),
    { name: 'settings', storage: createJSONStorage(() => zustandStorage) },
  ),
);
