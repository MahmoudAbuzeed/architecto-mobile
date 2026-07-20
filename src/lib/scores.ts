import type { Theme } from '@/theme/tokens';
import type { RepScoreLabel } from '@/types';

/**
 * Score → color/label thresholds, extracted from the web app's canonical
 * feedback panel (frontend/src/components/interview/InterviewResultPanel.tsx):
 * >=8 emerald · >=6 yellow · >=4 orange · else red.
 */
export function scoreColor(score: number, theme: Theme): string {
  if (score >= 8) return theme.emerald;
  if (score >= 6) return theme.yellow;
  if (score >= 4) return theme.orange;
  return theme.red;
}

export function scoreWord(score: number): string {
  if (score >= 8) return 'Strong';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Getting there';
  return 'Keep going';
}

/** Server band label → display color (bands: >=8 / 5-7 / <5). */
export function labelColor(label: RepScoreLabel, theme: Theme): string {
  if (label === 'strong') return theme.emerald;
  if (label === 'almost') return theme.yellow;
  return theme.orange;
}
