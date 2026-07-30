import React, { useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { AppText, Card, MonoText, PrimaryButton } from './Primitives';
import { useSettingsStore } from '@/store/settings.store';
import { showDialog } from '@/store/ui.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';

/**
 * First-run "want a daily nudge?" prime, shown on the quiz results screen (the
 * high-intent "remind me tomorrow" moment). Hidden once primed. The native
 * permission + scheduling calls are lazily required so this renders even on a
 * build without the notifications module wired.
 */
export function ReminderPrimeCard() {
  const theme = useTheme();
  const reminderPrimed = useSettingsStore((s) => s.reminderPrimed);
  const reminderHour = useSettingsStore((s) => s.reminderHour);
  const [dismissed, setDismissed] = useState(false);

  if (reminderPrimed || dismissed) return null;

  const onEnable = async () => {
    // Mark primed regardless of outcome so the card doesn't nag every day.
    useSettingsStore.getState().setReminderPrimed(true);
    setDismissed(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { primeNotificationPermissions } = require('@/lib/permissions');
      const outcome = await primeNotificationPermissions();
      if (outcome === 'granted') {
        useSettingsStore.getState().setRemindersEnabled(true);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const notifications = require('@/services/notifications.service');
        void notifications.syncDailyReminder?.();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const prefs = require('@/services/prefs-sync');
        void prefs.pushNotificationPrefs?.();
      } else if (outcome === 'blocked') {
        showDialog({
          title: strings.daily.remindTitle,
          message: strings.daily.remindBlocked,
          mood: 'teacher',
          buttons: [
            {
              text: strings.rep.openSettings,
              style: 'default',
              onPress: () => void Linking.openSettings(),
            },
            { text: strings.modals.ok, style: 'cancel' },
          ],
        });
      }
    } catch {
      // Notifications not available on this build — silently skip.
    }
  };

  return (
    <Card style={styles.card}>
      <MonoText weight="semiBold" color={theme.textSecondary} style={styles.kicker}>
        {strings.daily.remindTitle.toUpperCase()}
      </MonoText>
      <AppText secondary style={styles.body}>
        {strings.daily.remindBody(reminderHour)}
      </AppText>
      <PrimaryButton height={44} label={strings.daily.remindEnable} onPress={() => void onEnable()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10, marginTop: 6 },
  kicker: { fontSize: 10.5, letterSpacing: 1.4 },
  body: { fontSize: 13, lineHeight: 19 },
});
