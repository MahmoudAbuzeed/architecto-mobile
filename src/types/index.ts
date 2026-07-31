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

export interface ContinueTrackTopic {
  slug: string;
  title: string;
  category: string;
}

export interface ContinueTrackDrill {
  questionSlug: string;
  title: string;
  prompt: string;
  difficulty: RepDifficulty;
  category: string;
}

/** `/rep/home` continue block. Absent on old backends — render nothing. */
export interface ContinueTrack {
  track: string;
  label: string;
  icon: string;
  hex: string;
  topicsCompleted: number;
  topicsTotal: number;
  percentComplete: number;
  currentTopic: ContinueTrackTopic | null;
  nextDrill: ContinueTrackDrill | null;
}

export interface HomePayload {
  dailyRep: DailyRep;
  streak: StreakInfo;
  level: LevelProgress;
  isPro: boolean;
  /** Optional: only new backends send it (null = user has no track yet). */
  continueTrack?: ContinueTrack | null;
}

export interface ProbeQuestion {
  index: number;
  question: string;
  targetGap: string;
}

/** Probing-session block on answer/probe responses (new backends only). */
export interface RepSessionInfo {
  status: 'probing' | 'complete';
  probesUsed: number;
  maxProbes: number;
  probe: ProbeQuestion | null;
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
  /** Present only when `probing: true` was sent to a new backend. */
  session?: RepSessionInfo;
}

export interface ProbeFinal {
  score: number;
  scoreLabel: RepScoreLabel;
  verdict: string;
  bonusXp: number;
  remainingGaps: string[];
}

export interface ProbeResponse {
  probeIndex: number;
  addressed: boolean;
  feedback: string;
  xpEarned: number;
  session: RepSessionInfo;
  final: ProbeFinal | null;
  levelProgress: LevelProgress;
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
  /** New backends only. */
  estimatedSeconds?: number;
  category?: string;
}

export interface DrillsPayload {
  questions: DrillRow[];
  total: number;
  page: number;
  limit: number;
  freeDrillsRemainingToday: number | null;
  /** New backends only — derive from page/limit/total when absent. */
  hasMore?: boolean;
}

// ── Tracks catalog (`/rep/tracks*`, new backends only) ─────────────────────

export interface TrackSummary {
  track: string;
  label: string;
  icon: string;
  hex: string;
  isPrimary: boolean;
  isAdditional: boolean;
  topicsCompleted: number;
  topicsTotal: number;
  percentComplete: number;
  drillCount: number;
}

export interface TracksPayload {
  primaryTrack: string | null;
  additionalTracks: string[];
  tracks: TrackSummary[];
}

export interface TrackCategorySummary {
  slug: string;
  name: string;
  icon: string;
  topicsTotal: number;
  topicsCompleted: number;
  percentComplete: number;
  currentTopicSlug: string | null;
  drillCount: number;
  drillsDone: number;
}

export interface TrackDetail {
  track: string;
  label: string;
  icon: string;
  hex: string;
  topicsCompleted: number;
  topicsTotal: number;
  percentComplete: number;
  categories: TrackCategorySummary[];
}

// ── Daily micro-lesson (`/learn/daily*`, new backends only) ────────────────

export type DailyLessonStatus = 'ready' | 'completed' | 'track_complete';

export interface DailyTopic {
  slug: string;
  title: string;
  category: string;
  categoryName: string;
}

export interface DailyLesson {
  lessonId: string;
  title: string;
  hook: string;
  /** Markdown, ~600–800 words. */
  body: string;
  keyPoints: string[];
  estimatedMinutes: number;
}

export interface DailyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  // correctIndex/explanation intentionally absent — only arrive after submit.
}

export interface DailyAttempt {
  score: number;
  total: number;
  completedAt: string;
}

export interface DailyStreak {
  current: number;
  longest: number;
  doneToday: boolean;
}

export interface DailyLessonPayload {
  date: string; // YYYY-MM-DD (user tz)
  track: string;
  status: DailyLessonStatus;
  topic: DailyTopic | null;
  lesson: DailyLesson | null;
  questions: DailyQuizQuestion[] | null;
  attempt: DailyAttempt | null;
  streak: DailyStreak;
  // On a `completed` payload this is TOMORROW's topic (used for the "come back
  // tomorrow" copy). Absent on older backends → treat as null.
  nextTopic?: { slug: string; title: string } | null;
}

export interface DailyQuizResult {
  id: string;
  correct: boolean;
  correctIndex: number;
  explanation: string;
}

export interface DailySubmitResponse {
  score: number;
  total: number;
  results: DailyQuizResult[];
  xpEarned: number;
  streak: { current: number; longest: number; extended: boolean };
  trackProgress: {
    topicsCompleted: number;
    topicsTotal: number;
    percentComplete: number;
  };
  nextTopic: { slug: string; title: string } | null;
}

/** `GET/PATCH /users/me/notification-prefs` (new backends only). */
export interface NotificationPrefs {
  timezone: string | null;
  reminderHour: number | null;
  learningRemindersEnabled: boolean;
}

/**
 * `GET /learn/topics?category=` row (shared with web). Only the fields mobile
 * renders — the endpoint sends more.
 */
export interface TopicRow {
  slug: string;
  title: string;
  status: 'locked' | 'available' | 'completed';
  /**
   * Catalog value (the web's long-form estimate). NEVER rendered on mobile —
   * every micro-session reads as ~5 MIN. Kept because the shared endpoint
   * sends it and the web still uses it.
   */
  estimatedMinutes?: number;
  prerequisites?: string[];
  missingPrerequisites?: Array<{ slug: string; title: string }>;
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
  /** Opt into the multi-turn probing session (ignored by old backends). */
  probing?: boolean;
}
