import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/settings.store';
import { useDailyStore } from '@/store/daily.store';
import { useAuthStore } from '@/store/auth.store';
import { navigationRef } from '@/app/navigation/navigationRef';
import { nextReminderAt, reminderCopyFor } from '@/lib/reminder-schedule';
import { todayLocalISO } from '@/lib/dates';

/**
 * Local daily-reminder scheduling over react-native-notify-kit (the maintained,
 * New-Architecture Notifee fork). Every call is guarded — reminders are a
 * nice-to-have and must never crash the app or block a submit. The native
 * module is required lazily so a bundle/build without it degrades to no-ops.
 *
 * Scheduling strategy: a SINGLE-SHOT trigger re-armed on every sync (app open,
 * foreground, submit, pref change), NOT RepeatFrequency.DAILY. This gives us
 * "skip today once the lesson is done" for free and avoids the upstream
 * repeat-trigger bugs.
 */

const REMINDER_ID = 'daily-lesson-reminder';
const CHANNEL_ID = 'daily-reminder';

// Deep-link stashed when a notification is tapped before the nav tree / auth
// are ready (cold start). Flushed by flushPendingDeepLink().
let pendingDeepLink: string | null = null;

function getNotifee(): {
  mod: any;
  TriggerType: any;
  EventType: any;
  AndroidImportance: any;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notifee = require('react-native-notify-kit');
    return {
      mod: notifee.default ?? notifee,
      TriggerType: notifee.TriggerType ?? { TIMESTAMP: 0, INTERVAL: 1 },
      EventType: notifee.EventType ?? { DISMISSED: 0, PRESS: 1 },
      AndroidImportance: notifee.AndroidImportance ?? { HIGH: 4, DEFAULT: 3 },
    };
  } catch {
    return null;
  }
}

/** Idempotent Android channel creation. Safe to call on every app start. */
export async function ensureChannel(): Promise<void> {
  const n = getNotifee();
  if (!n || Platform.OS !== 'android') return;
  try {
    await n.mod.createChannel({
      id: CHANNEL_ID,
      name: 'Daily reminder',
      importance: n.AndroidImportance.HIGH,
    });
  } catch {
    // best-effort
  }
}

/**
 * THE single entry point: cancel and reschedule the daily reminder from current
 * state (settings + today's completion). Call on app start, foreground, submit
 * success, and pref changes.
 */
export async function syncDailyReminder(): Promise<void> {
  const n = getNotifee();
  if (!n) return;
  try {
    const { remindersEnabled, reminderHour, contentLanguage } =
      useSettingsStore.getState();

    // Always cancel first so we never stack triggers.
    await n.mod.cancelTriggerNotification(REMINDER_ID).catch(() => undefined);

    if (!remindersEnabled) return;

    // Skip today if the lesson is already done (fresh cache only).
    const daily = useDailyStore.getState();
    const doneToday =
      daily.daily?.streak.doneToday === true &&
      daily.fetchedFor?.date === todayLocalISO();

    const fireDate = nextReminderAt(new Date(), reminderHour, doneToday);
    const copy = reminderCopyFor(fireDate, contentLanguage);

    await n.mod.createTriggerNotification(
      {
        id: REMINDER_ID,
        title: copy.title,
        body: copy.body,
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: 'default', launchActivity: 'default' },
          smallIcon: 'ic_launcher',
        },
        data: { deepLink: 'daily-lesson' },
      },
      {
        type: n.TriggerType.TIMESTAMP,
        timestamp: fireDate.getTime(),
      },
    );
  } catch {
    // reminders are optional
  }
}

export async function cancelAllReminders(): Promise<void> {
  const n = getNotifee();
  if (!n) return;
  try {
    await n.mod.cancelTriggerNotification(REMINDER_ID).catch(() => undefined);
    await n.mod.cancelAllNotifications?.().catch(() => undefined);
  } catch {
    // best-effort
  }
}

/**
 * Wire the foreground press handler. Returns an unsubscribe fn (noop when the
 * module is absent). Call once from App.tsx.
 */
export function wireNotificationEvents(): () => void {
  const n = getNotifee();
  if (!n) return () => undefined;
  try {
    return n.mod.onForegroundEvent(({ type, detail }: any) => {
      if (type === n.EventType.PRESS && detail?.notification?.data?.deepLink) {
        openDailyLessonFromNotification();
      }
    });
  } catch {
    return () => undefined;
  }
}

/** Cold-start: did the app launch from a notification tap? */
export async function checkInitialNotification(): Promise<void> {
  const n = getNotifee();
  if (!n) return;
  try {
    const initial = await n.mod.getInitialNotification?.();
    if (initial?.notification?.data?.deepLink) {
      openDailyLessonFromNotification();
    }
  } catch {
    // best-effort
  }
}

/**
 * Navigate to the daily lesson. If the nav tree or auth aren't ready yet (cold
 * start), stash the intent and flush once ready.
 */
export function openDailyLessonFromNotification(): void {
  const authed = useAuthStore.getState().isAuthenticated;
  if (navigationRef.isReady() && authed) {
    navigationRef.navigate('DailyLesson', { from: 'notification' });
    pendingDeepLink = null;
  } else {
    pendingDeepLink = 'daily-lesson';
  }
}

/** Call from NavigationContainer.onReady and after auth flips true. */
export function flushPendingDeepLink(): void {
  if (!pendingDeepLink) return;
  const authed = useAuthStore.getState().isAuthenticated;
  if (navigationRef.isReady() && authed) {
    pendingDeepLink = null;
    navigationRef.navigate('DailyLesson', { from: 'notification' });
  }
}
