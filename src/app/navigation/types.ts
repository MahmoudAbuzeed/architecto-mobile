import type { NavigatorScreenParams } from '@react-navigation/native';
import type { GradingResponse } from '@/types';

export type RootStackParamList = {
  // Auth
  Onboarding: undefined;
  EmailAuth: { mode: 'login' | 'register' };
  // Main
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  RepSession: {
    drillSlug: string | null;
    title: string;
    prompt: string;
    /** Learn-category slug the drill belongs to (when known). */
    category?: string;
  };
  Feedback: { result: GradingResponse };
  Celebration: {
    streak: number;
    isNewRecord: boolean;
    xpToday: number;
  };
  // Daily micro-lesson flow (Root-level cards, like the rep group).
  // `topicSlug` present → a specific Learn-tab topic (off the daily dose);
  // absent → today's daily dose. `review` opens a completed topic read-only
  // (hides the quiz CTA) — the free-user re-read path.
  DailyLesson:
    | { from?: 'notification'; topicSlug?: string; review?: boolean }
    | undefined;
  DailyQuiz: { topicSlug?: string } | undefined;
  TrackPicker: { context: 'first-pick' | 'switch' | 'start' };
  // In-app purchase paywall. `source` is optional analytics context only.
  Paywall: { source?: 'topic' | 'voice' | 'lesson' | 'interceptor' } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Learn: NavigatorScreenParams<LearnStackParamList> | undefined;
  Stats: undefined;
  Profile: undefined;
};

export type LearnStackParamList = {
  // `track` lets the Learn tab view an additional (non-primary) track; omitted
  // falls back to the primary track.
  TrackOverview: { track?: string } | undefined;
  // `hex` is the track's accent colour, threaded through for the journey path.
  CategoryTopics: { category: string; name: string; hex?: string };
  AllDrills: undefined;
};
