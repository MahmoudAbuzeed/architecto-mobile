import { useDailyStore } from '@/store/daily.store';
import { useTopicLessonStore } from '@/store/topicLesson.store';
import type { DailyLessonPayload, DailySubmitResponse } from '@/types';

export interface LessonSource {
  payload: DailyLessonPayload | null;
  isLoading: boolean;
  error: string | null;
  fetch: (opts?: { force?: boolean }) => void | Promise<void>;
  submit: (answers: Record<string, number>) => Promise<DailySubmitResponse>;
  /** True when this is a browsed Learn-tab topic, not today's daily dose. */
  isTopic: boolean;
}

/**
 * Feeds the lesson + quiz screens from the right store: the daily-dose cache
 * ([[daily.store]]) when opened as today's lesson, or the ephemeral
 * [[topicLesson.store]] when opened for a specific topic from the Learn tab
 * (`topicSlug` set). Both stores are read unconditionally — only the return
 * value switches — so the hook order stays stable across renders.
 */
export function useLessonSource(topicSlug?: string): LessonSource {
  const dailyPayload = useDailyStore((s) => s.daily);
  const dailyLoading = useDailyStore((s) => s.isLoading);
  const dailyError = useDailyStore((s) => s.error);
  const dailyFetch = useDailyStore((s) => s.fetch);
  const dailySubmit = useDailyStore((s) => s.submit);

  const topicPayload = useTopicLessonStore((s) => s.payload);
  const topicLoading = useTopicLessonStore((s) => s.isLoading);
  const topicError = useTopicLessonStore((s) => s.error);
  const topicFetch = useTopicLessonStore((s) => s.fetch);
  const topicSubmit = useTopicLessonStore((s) => s.submit);

  if (topicSlug) {
    return {
      payload: topicPayload,
      isLoading: topicLoading,
      error: topicError,
      fetch: () => topicFetch(topicSlug),
      submit: topicSubmit,
      isTopic: true,
    };
  }
  return {
    payload: dailyPayload,
    isLoading: dailyLoading,
    error: dailyError,
    fetch: dailyFetch,
    submit: dailySubmit,
    isTopic: false,
  };
}
