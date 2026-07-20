// API contracts — mirror the backend rep module + auth responses exactly
// (architecto/backend/src/rep, verified against the live endpoints).

export type RepScoreLabel = 'strong' | 'almost' | 'keep-going';
export type RepCategoryGroup = 'engineering' | 'management' | 'product';
export type RepDifficulty = 'easy' | 'medium' | 'hard';
export type InputMode = 'voice' | 'typed';

export interface Subscription {
  planSlug: string;
  status: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  subscription?: Subscription | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean;
  requiresVerification?: boolean;
  requires2FA?: boolean;
  email?: string;
  message?: string;
}

export interface WeekDay {
  date: string; // YYYY-MM-DD (UTC)
  status: 'done' | 'today' | 'missed' | 'future';
}

export interface StreakInfo {
  current: number;
  longest: number;
  activeToday: boolean;
  freezesAvailable: number;
  week: WeekDay[];
}

export interface LevelProgress {
  level: number;
  levelName: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
}

export interface RepFollowUp {
  id: string; // attemptId
  question: string;
  xpBonus: number;
}

export interface RepAttemptSummary {
  attemptId: string;
  verdict: string;
  score: number;
  scoreLabel: RepScoreLabel;
  covered: string[];
  missed: string[];
  xpEarned: number;
  followUp: RepFollowUp | null;
}

export interface DailyRep {
  repId: string;
  questionSlug: string;
  title: string;
  prompt: string;
  difficulty: RepDifficulty;
  category: string;
  categoryGroup: RepCategoryGroup;
  estimatedSeconds: number;
  status: 'pending' | 'completed';
  attempt: RepAttemptSummary | null;
}

export interface HomePayload {
  dailyRep: DailyRep;
  streak: StreakInfo;
  level: LevelProgress;
  isPro: boolean;
}

export interface GradingResponse {
  attemptId: string;
  verdict: string;
  score: number;
  scoreLabel: RepScoreLabel;
  covered: string[];
  missed: string[];
  followUp: RepFollowUp | null;
  xpEarned: number;
  streak: {
    current: number;
    longest: number;
    isNewRecord: boolean;
    extendedToday: boolean;
    freezeApplied: boolean;
  };
  levelProgress: LevelProgress;
  celebrate: boolean;
}

export interface FollowUpResponse {
  addressed: boolean;
  feedback: string;
  xpEarned: number;
  levelProgress: LevelProgress;
}

export interface DrillRow {
  questionSlug: string;
  title: string;
  difficulty: RepDifficulty;
  estimatedMinutes: number;
  categoryGroup: RepCategoryGroup;
  done: boolean;
}

export interface DrillsPayload {
  questions: DrillRow[];
  total: number;
  page: number;
  limit: number;
  freeDrillsRemainingToday: number | null;
}

export interface StatsPayload {
  totals: {
    reps: number;
    drills: number;
    averageScore: number | null;
    bestScore: number | null;
  };
  level: LevelProgress;
  streak: { current: number; longest: number; freezesAvailable: number };
  history: Array<{
    date: string;
    attempts: number;
    xpEarned: number;
    bestScore: number;
  }>;
  recent: Array<{
    attemptId: string;
    date: string;
    questionTitle: string;
    source: 'DAILY' | 'DRILL';
    score: number;
    scoreLabel: RepScoreLabel;
    xpEarned: number;
  }>;
}

export interface SubmitAnswerBody {
  transcript: string;
  inputMode: InputMode;
  language?: string;
  durationSeconds?: number;
}
