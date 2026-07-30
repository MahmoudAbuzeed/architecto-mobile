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
  DailyLesson: { from?: 'notification' } | undefined;
  DailyQuiz: undefined;
  TrackPicker: { context: 'first-pick' | 'switch' | 'start' };
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
  CategoryTopics: { category: string; name: string };
  AllDrills: undefined;
};
