/**
 * Witty engineer one-liners, ported from the web app's single source of truth
 * (architecto/frontend/src/lib/quips.ts) so both clients share one voice.
 * Shown wherever the app would otherwise show a spinner — which is nowhere,
 * because this app has no spinners.
 */

/** "Thinking out loud" lines while grading / generating. */
export const GENERATING_QUIPS: string[] = [
  'Negotiating with the CAP theorem…',
  'Re-reading that Redis part twice…',
  'Pretending the network is reliable…',
  'Convincing the database to behave under load…',
  'Adding a cache, creating two new problems…',
  'Sharding things that did not ask to be sharded…',
  'Choosing my words carefully…',
  'Estimating capacity with suspicious confidence…',
  'Removing the single point of failure we just added…',
  'Trading consistency for availability (and back again)…',
];

/** Lines while the tutor is thinking (no content yet). */
export const THINKING_QUIPS: string[] = [
  'Warming up the neurons…',
  'Connecting the dots…',
  'Doing the mental math…',
  'Consulting the rubber duck…',
  'Pretending this is easy…',
];

/** Encouraging, never-mean reactions to a weak answer. */
export const WRONG_ANSWER_QUIPS: string[] = [
  'Bold guess. Wrong, but bold.',
  'Even prod fails sometimes.',
  'Not it — but now you’ll never forget it.',
  'Close, like eventual consistency.',
  'Off by one, metaphorically.',
  'Good instinct, wrong branch.',
];

/** Short hype lines for streak / completion milestones. */
export const MILESTONE_QUIPS: string[] = [
  'Streak secured. Uptime: impressive.',
  'Another day, zero incidents.',
  'You’re scaling horizontally now.',
  'That’s a green build.',
  'Consistency level: strong.',
];

/** Typed-answer mode nudge lines (quiet-place mode). */
export const TYPING_QUIPS: string[] = [
  'Library? Meeting? Say no more — type it. Same grading, same XP, zero judgment.',
  'Voice is optional. Judgment is not.',
  'Typing counts. The keyboard is a valid instrument.',
];

/**
 * Pick a line from `pool`, avoiding `last` so the same line never shows twice
 * in a row. Pure — the caller owns any persisted `last`.
 */
export function pickQuip(pool: string[], last?: string): string {
  if (pool.length === 0) return '';
  const candidates = pool.filter((q) => q !== last);
  const choices = candidates.length > 0 ? candidates : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}
