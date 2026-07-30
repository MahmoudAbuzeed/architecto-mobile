import React, { useCallback } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { AppText, Card, Chip } from './Primitives';
import { useSettingsStore } from '@/store/settings.store';
import { showDialog } from '@/store/ui.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';

// Hours offered for the reminder (6am–10pm covers realistic study windows).
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22

/**
 * Profile "Daily reminder" section: an opt-in toggle (gated by OS notification
 * permission) and an hour picker. Every change pushes the pref to the backend
 * and re-arms the local reminder. Native calls are lazily required + guarded so
 * this works even on a build without the notifications module.
 */
export function ReminderSettingsCard() {
  const theme = useTheme();
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled);
  const reminderHour = useSettingsStore((s) => s.reminderHour);

  const syncAndPush = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@/services/notifications.service').syncDailyReminder?.();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@/services/prefs-sync').pushNotificationPrefs?.();
    } catch {
      // notifications optional
    }
  }, []);

  const onToggle = useCallback(
    async (next: boolean) => {
      const s = useSettingsStore.getState();
      if (!next) {
        s.setRemindersEnabled(false);
        syncAndPush();
        return;
      }
      // Turning on: prime OS permission first.
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { primeNotificationPermissions } = require('@/lib/permissions');
        const outcome = await primeNotificationPermissions();
        if (outcome === 'granted') {
          s.setRemindersEnabled(true);
          s.setReminderPrimed(true);
          syncAndPush();
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
        // No notifications module — leave the toggle off.
      }
    },
    [syncAndPush],
  );

  const onPickHour = useCallback(
    (h: number) => {
      useSettingsStore.getState().setReminderHour(h);
      if (useSettingsStore.getState().remindersEnabled) syncAndPush();
    },
    [syncAndPush],
  );

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText style={styles.label}>{strings.profile.remindersTitle}</AppText>
          <AppText dim style={styles.description}>
            {strings.profile.remindersDescription}
          </AppText>
        </View>
        <Switch
          value={remindersEnabled}
          onValueChange={(v) => void onToggle(v)}
          trackColor={{ true: theme.accent, false: theme.borderStrong }}
        />
      </View>

      {remindersEnabled && (
        <>
          <AppText dim style={styles.hourLabel}>
            {strings.profile.reminderHour}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {HOURS.map((h) => (
              <Chip
                key={h}
                label={`${String(h).padStart(2, '0')}:00`}
                active={reminderHour === h}
                onPress={() => onPickHour(h)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  description: { fontSize: 11.5, lineHeight: 16 },
  hourLabel: { fontSize: 11.5 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
});
