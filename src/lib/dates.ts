/**
 * The device's LOCAL calendar day as "YYYY-MM-DD". Used as the daily-cache
 * staleness key so the hero resets at local midnight (a payload fetched
 * "yesterday" is stale even if the store is warm).
 */
export function todayLocalISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
