/** 1240 → "1,240" — mono numerics in the design always use separators. */
export function formatXp(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('en-US');
}

/** "1,240 / 1,500 XP" (top level: "30,000 XP"). */
export function formatLevelProgress(
  totalXp: number,
  nextLevelXp: number | null,
): string {
  if (nextLevelXp === null) return `${formatXp(totalXp)} XP`;
  return `${formatXp(totalXp)} / ${formatXp(nextLevelXp)} XP`;
}

/** Fraction [0..1] of the way from the current level floor to the next. */
export function levelFraction(
  totalXp: number,
  currentLevelXp: number,
  nextLevelXp: number | null,
): number {
  if (nextLevelXp === null) return 1;
  const span = nextLevelXp - currentLevelXp;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (totalXp - currentLevelXp) / span));
}

/** 95 → "1:35" (mm:ss countdown display). */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "SYSTEM_DESIGN_FUNDAMENTALS" → "System Design Fundamentals". */
export function titleCaseSlug(slug: string): string {
  return slug
    .toLowerCase()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** "Sunday, Jul 20" greeting date. */
export function formatHomeDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Greeting by local hour. */
export function greetingFor(d: Date, name?: string): string {
  const h = d.getHours();
  const part = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}.` : `${part}.`;
}

/** Initials for the avatar chip ("Omar Malik" → "OM", "Omar" → "OM"). */
export function initials(name?: string): string {
  if (!name?.trim()) return '·';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}
