import { create } from 'zustand';
import { learnService } from '@/services/learn.service';
import { useSettingsStore } from './settings.store';
import { useHomeStore } from './home.store';
import { useTopicsStore } from './topics.store';
import { toAppError } from '@/lib/api-error';
import type { DailyLessonPayload, DailySubmitResponse } from '@/types';

/**
 * A single browsed topic's lesson (Learn tab), fetched from
 * `/learn/daily/lesson/:slug`. Deliberately NOT persisted and NOT the daily
 * dose: opening a topic here never touches today's dose cache ([[daily.store]]).
 * One slot — the newest opened topic wins; a monotonic token drops stale
 * responses when the user opens topics in quick succession.
 */
interface TopicLessonState {
  payload: DailyLessonPayload | null;
  topicSlug: string | null;
  isLoading: boolean;
  error: string | null;
  fetch: (topicSlug: string) => Promise<void>;
  submit: (answers: Record<string, number>) => Promise<DailySubmitResponse>;
  clear: () => void;
}

let fetchSeq = 0;

export const useTopicLessonStore = create<TopicLessonState>((set, get) => ({
  payload: null,
  topicSlug: null,
  isLoading: false,
  error: null,

  fetch: async (topicSlug) => {
    const language = useSettingsStore.getState().contentLanguage;
    const mySeq = ++fetchSeq;
    // Opening a different topic drops the previous payload so the screen never
    // flashes the wrong lesson while the new one loads.
    set({
      isLoading: true,
      error: null,
      topicSlug,
      payload: get().topicSlug === topicSlug ? get().payload : null,
    });
    try {
      const payload = await learnService.getTopicLesson(topicSlug, language);
      if (mySeq !== fetchSeq) return; // superseded by a newer open
      set({ payload, topicSlug, isLoading: false });
    } catch (e) {
      if (mySeq !== fetchSeq) return;
      set({ isLoading: false, error: toAppError(e).message });
    }
  },

  submit: async (answers) => {
    const payload = get().payload;
    if (!payload?.topic) {
      throw new Error('No lesson to submit.');
    }
    const res = await learnService.submitTopicLesson({
      topicSlug: payload.topic.slug,
      answers,
      lessonId: payload.lesson?.lessonId,
    });
    // Reflect completion locally so a re-open shows the done state.
    set({
      payload: {
        ...payload,
        status: 'completed',
        attempt: {
          score: res.score,
          total: res.total,
          completedAt: new Date().toISOString(),
        },
      },
    });
    // Topic status + home progress just changed — refresh both. The Learn
    // screen subscribes to the topics store, so its glyphs update on return.
    void useHomeStore.getState().fetch();
    void useTopicsStore.getState().fetch(payload.topic.category);
    return res;
  },

  clear: () => set({ payload: null, topicSlug: null, error: null }),
}));
