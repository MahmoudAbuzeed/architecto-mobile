/**
 * Track/category disc glyphs. The backend `icon` field carries lucide icon
 * NAMES (e.g. "Compass", "Smartphone") for the web app; the mobile app has no
 * lucide, so rendering that string shows truncated text. We map each learning
 * track to an emoji instead — distinctive, colorful, and always renders on iOS.
 */
const TRACK_EMOJI: Record<string, string> = {
  SYSTEM_DESIGN: '🏛️',
  WEB_DEVELOPMENT: '🌐',
  MOBILE_DEVELOPMENT: '📱',
  DATA_AI: '🤖',
  INFRASTRUCTURE: '☁️',
  QUALITY_TESTING: '🧪',
  AGILE_PROCESS: '🔄',
  PRODUCT_MANAGEMENT: '📦',
  UX_DESIGN: '🎨',
  FUNDAMENTALS: '📚',
};

export function trackEmoji(track: string | undefined): string {
  return (track && TRACK_EMOJI[track]) || '📘';
}

/**
 * There are ~110 categories, so we don't emoji-map them — the first letter of
 * the category name in the tinted disc reads cleanly and always works.
 */
export function categoryInitial(name: string | undefined): string {
  const c = (name ?? '').trim().charAt(0);
  return c ? c.toUpperCase() : '•';
}
