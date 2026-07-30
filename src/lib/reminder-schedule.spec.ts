import { nextReminderAt, reminderCopyFor } from './reminder-schedule';

describe('nextReminderAt', () => {
  it('schedules today when before the hour and not done', () => {
    const now = new Date(2026, 6, 30, 7, 30); // 07:30 local, July 30
    const at = nextReminderAt(now, 9, false);
    expect(at.getFullYear()).toBe(2026);
    expect(at.getDate()).toBe(30);
    expect(at.getHours()).toBe(9);
    expect(at.getMinutes()).toBe(0);
  });

  it('schedules tomorrow when already past the hour', () => {
    const now = new Date(2026, 6, 30, 10, 0); // 10:00, after 09:00
    const at = nextReminderAt(now, 9, false);
    expect(at.getDate()).toBe(31);
    expect(at.getHours()).toBe(9);
  });

  it('schedules tomorrow when done today even if before the hour', () => {
    const now = new Date(2026, 6, 30, 7, 0);
    const at = nextReminderAt(now, 9, true);
    expect(at.getDate()).toBe(31);
  });

  it('rolls month/year at the boundary', () => {
    const now = new Date(2026, 11, 31, 23, 0); // Dec 31 23:00
    const at = nextReminderAt(now, 9, false);
    expect(at.getFullYear()).toBe(2027);
    expect(at.getMonth()).toBe(0);
    expect(at.getDate()).toBe(1);
  });

  it('clamps an out-of-range hour', () => {
    const now = new Date(2026, 6, 30, 0, 0);
    expect(nextReminderAt(now, 99, false).getHours()).toBe(23);
  });
});

describe('reminderCopyFor', () => {
  it('is deterministic for the same day and rotates across days', () => {
    const d1 = new Date(2026, 6, 30, 9, 0);
    const d2 = new Date(2026, 6, 31, 9, 0);
    const a = reminderCopyFor(d1, 'en');
    const aAgain = reminderCopyFor(d1, 'en');
    const b = reminderCopyFor(d2, 'en');
    expect(a).toEqual(aAgain);
    // Different day → (very likely) a different pool entry.
    expect(a.body === b.body && a.title === b.title).toBe(false);
  });

  it('returns Arabic copy for an Arabic content language', () => {
    const d = new Date(2026, 6, 30, 9, 0);
    const ar = reminderCopyFor(d, 'ar-eg');
    // Arabic copy contains Arabic script.
    expect(/[؀-ۿ]/.test(ar.body)).toBe(true);
  });
});
