import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Card,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { StreakFlame } from '@/components/StreakFlame';
import { WeekStrip } from '@/components/WeekStrip';
import { XpBar } from '@/components/XpBar';
import { QuipLoader } from '@/components/QuipLoader';
import { PlayIcon } from '@/components/icons';
import { useHomeStore } from '@/store/home.store';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { formatHomeDate, greetingFor, initials } from '@/lib/format';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const home = useHomeStore((s) => s.home);
  const fetch = useHomeStore((s) => s.fetch);
  const user = useAuthStore((s) => s.user);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  if (!home) {
    return (
      <Screen style={styles.loading}>
        <QuipLoader pool={THINKING_QUIPS} size={160} />
      </Screen>
    );
  }

  const { dailyRep, streak, level } = home;
  const now = new Date();
  const completed = dailyRep.status === 'completed';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.headerRow}>
          <View>
            <AppText secondary style={styles.date}>
              {formatHomeDate(now)}
            </AppText>
            <AppText style={styles.greeting}>
              {greetingFor(now, user?.name)}
            </AppText>
          </View>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.card, borderColor: theme.borderStrong },
            ]}
          >
            <AppText secondary style={styles.avatarText}>
              {initials(user?.name)}
            </AppText>
          </View>
        </View>

        {/* Streak card */}
        <Card style={styles.streakCard}>
          <StreakFlame size={56} />
          <View style={styles.streakInfo}>
            <View style={styles.streakNumberRow}>
              <MonoText weight="bold" color={theme.accent} style={styles.streakNumber}>
                {streak.current}
              </MonoText>
              <AppText style={styles.streakLabel}>{strings.home.dayStreak}</AppText>
            </View>
            <AppText secondary style={styles.streakQuip}>
              {strings.home.streakQuip}
            </AppText>
          </View>
        </Card>

        {/* Week strip */}
        <WeekStrip week={streak.week} />

        {/* Today's rep */}
        <Card elevated style={styles.repCard}>
          <View style={styles.repHeaderRow}>
            <MonoText weight="semiBold" color={theme.textSecondary} style={styles.repKicker}>
              {strings.home.todaysRep}
            </MonoText>
            <MonoText weight="medium" color={theme.textSecondary} style={styles.repMeta}>
              {strings.home.repMeta}
            </MonoText>
          </View>
          <AppText style={styles.repTitle}>{dailyRep.title}</AppText>
          <AppText secondary style={styles.repSubtitle}>
            {completed
              ? dailyRep.attempt?.verdict ?? strings.home.completedTitle
              : 'Out loud, off the cuff. You get 90 seconds and my complete, judgmental attention.'}
          </AppText>
          <PrimaryButton
            height={48}
            icon={
              completed ? undefined : (
                <PlayIcon size={14} color={theme.actionText} />
              )
            }
            label={completed ? strings.home.completedCta : strings.home.start}
            onPress={() => {
              if (completed && dailyRep.attempt) {
                navigation.navigate('Feedback', {
                  result: {
                    ...dailyRep.attempt,
                    streak: {
                      current: streak.current,
                      longest: streak.current,
                      isNewRecord: false,
                      extendedToday: streak.activeToday,
                      freezeApplied: false,
                    },
                    levelProgress: level,
                    celebrate: false,
                  },
                });
              } else {
                navigation.navigate('RepSession', {
                  drillSlug: null,
                  title: dailyRep.title,
                  prompt: dailyRep.prompt,
                  estimatedSeconds: dailyRep.estimatedSeconds,
                });
              }
            }}
          />
        </Card>

        {/* Level */}
        <XpBar level={level} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 14, paddingBottom: 28 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: { fontSize: 12.5 },
  greeting: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '600' },
  streakCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakInfo: { flex: 1, minWidth: 0 },
  streakNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  streakNumber: { fontSize: 26 },
  streakLabel: { fontSize: 13, fontWeight: '600' },
  streakQuip: { fontSize: 12, lineHeight: 17 },
  repCard: { padding: 18, gap: 12 },
  repHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  repMeta: { fontSize: 11 },
  repTitle: { fontSize: 20, fontWeight: '700', lineHeight: 25 },
  repSubtitle: { fontSize: 13, lineHeight: 19.5 },
});
