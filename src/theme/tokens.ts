// Design palette from "Architecto Mobile v1" (Claude Design). Dark is the
// default (interview theme); light mirrors the 1h Home variant. Values are
// the exact hexes from the approved screens — don't eyeball new ones.

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  elevated: string;
  text: string;
  textSecondary: string;
  textDim: string;
  border: string;
  borderStrong: string;
  /** Primary action surface (light button on dark bg / dark on light). */
  action: string;
  actionText: string;
  accent: string; // streak orange
  accentSoft: string;
  xp: string; // yellow
  emerald: string;
  yellow: string;
  orange: string;
  red: string;
  blue: string;
  violet: string;
  archieCircle: string; // light disc behind Archie lotties
}

export const darkTheme: Theme = {
  dark: true,
  bg: '#17181c',
  card: '#232428',
  elevated: '#2d2e33',
  text: '#fafafa',
  textSecondary: '#a3a3a3',
  textDim: '#6b6b70',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  action: '#e5e5e5',
  actionText: '#17181c',
  accent: '#f97316',
  accentSoft: 'rgba(249,115,22,0.18)',
  xp: '#eab308',
  emerald: '#10b981',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  archieCircle: '#eceef2',
};

export const lightTheme: Theme = {
  dark: false,
  bg: '#ffffff',
  card: '#ffffff',
  elevated: '#171717',
  text: '#262626',
  textSecondary: '#8e8e8e',
  textDim: '#8e8e8e',
  border: '#ebebeb',
  borderStrong: '#d4d4d4',
  action: '#171717',
  actionText: '#fafafa',
  accent: '#f97316',
  accentSoft: 'rgba(249,115,22,0.12)',
  xp: '#eab308',
  emerald: '#10b981',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  archieCircle: '#eceef2',
};

// Foreground palette for the dark "spotlight" cards (Card `elevated`). Those
// cards are a near-black surface in BOTH themes (elevated is #2d2e33 dark /
// #171717 light), so their text must be a fixed light set — theme.text goes
// dark in the light theme and would be invisible on them.
export const ELEVATED_FG = {
  text: '#fafafa',
  secondary: '#c4c4c4',
  dim: '#8f8f96',
  border: 'rgba(255,255,255,0.18)',
};

export const CATEGORY_GROUP_COLORS: Record<string, string> = {
  engineering: '#3b82f6',
  management: '#8b5cf6',
  product: '#10b981',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981',
  medium: '#eab308',
  hard: '#ef4444',
};

export const radius = {
  sm: 11,
  md: 12,
  lg: 14,
  xl: 16,
  bubble: 18,
  pill: 999,
};
