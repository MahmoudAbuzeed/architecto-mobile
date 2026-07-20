import type { GradingResponse } from '@/types';

export type RootStackParamList = {
  // Auth
  Onboarding: undefined;
  EmailAuth: { mode: 'login' | 'register' };
  // Main
  Tabs: undefined;
  RepSession: {
    drillSlug: string | null;
    title: string;
    prompt: string;
    estimatedSeconds: number;
  };
  Feedback: { result: GradingResponse };
  Celebration: {
    streak: number;
    isNewRecord: boolean;
    xpToday: number;
  };
};

export type TabParamList = {
  Home: undefined;
  Drills: undefined;
  Stats: undefined;
  Profile: undefined;
};
