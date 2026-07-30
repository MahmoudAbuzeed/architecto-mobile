import { reminderPoolFor, type ReminderCopy } from '@/i18n/reminder-copy';
import type { ContentLanguage } from '@/lib/languages';

/**
 * When the next daily reminder should fire. Single-shot scheduling (re-armed on
 * every sync) rather than a repeat trigger, so "skip today once done" is free
 * and we sidestep the upstream repeat-trigger bugs.
 *
 * - Not done today and `now` is before today's reminder hour → today at hour:00.
 * - Otherwise → tomorrow at hour:00.
 *
 * Built with the local Date constructor so the platform handles DST.
 */
export function nextReminderAt(now: Date, hour: number, doneToday: boolean): Date {
  const h = clampHour(hour);
  const todayAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    0,
    0,
    0,
  );
  if (!doneToday && todayAt.getTime() > now.getTime()) {
    return todayAt;
  }
  // Tomorrow at the reminder hour.
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    h,
    0,
    0,
    0,
  );
}

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 9;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

/** Days since the Unix epoch in local time — a stable per-day rotation index. */
function localDayIndex(date: Date): number {
  const midnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  return Math.floor(midnight / 86400000);
}

/**
 * Deterministically rotate through the compound-learning copy pool by the
 * fire date's day index, so consecutive days get different lines.
 */
export function reminderCopyFor(
  fireDate: Date,
  language: ContentLanguage,
): ReminderCopy {
  const pool = reminderPoolFor(language);
  const idx = ((localDayIndex(fireDate) % pool.length) + pool.length) % pool.length;
  return pool[idx];
}
