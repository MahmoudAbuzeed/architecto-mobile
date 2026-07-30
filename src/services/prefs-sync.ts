import { userService } from './user.service';
import { useSettingsStore } from '@/store/settings.store';

/**
 * Two-way sync of the daily-reminder prefs with the backend
 * (`/users/me/notification-prefs`). All best-effort: an old backend 404s and we
 * stay in local-only mode. The device timezone is always pushed so the
 * server-side email reminder cron and the client stay on the same day boundary.
 */

function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** On login/app-start: hydrate local settings from the server, push device tz. */
export async function syncNotificationPrefsOnLogin(): Promise<void> {
  const tz = deviceTimezone();
  try {
    const prefs = await userService.getNotificationPrefs();
    const s = useSettingsStore.getState();
    if (typeof prefs.reminderHour === 'number') {
      s.setReminderHour(prefs.reminderHour);
    }
    // The server flag reflects the (email) reminder opt-in; only let it turn the
    // local reminder ON if the OS permission was already granted — otherwise we
    // keep the local default (off) until the user primes it.
    if (prefs.learningRemindersEnabled === false) {
      s.setRemindersEnabled(false);
    }
    // Always keep the server timezone current.
    if (tz && prefs.timezone !== tz) {
      await userService.updateNotificationPrefs({ timezone: tz });
    }
  } catch {
    // Old backend / offline: local-only mode. Still try to push the tz.
    if (tz) {
      await userService
        .updateNotificationPrefs({ timezone: tz })
        .catch(() => undefined);
    }
  }
}

/** On a local reminder-pref change: push hour + enabled flag to the server. */
export async function pushNotificationPrefs(): Promise<void> {
  const { reminderHour, remindersEnabled } = useSettingsStore.getState();
  await userService
    .updateNotificationPrefs({
      reminderHour,
      learningRemindersEnabled: remindersEnabled,
    })
    .catch(() => undefined);
}
