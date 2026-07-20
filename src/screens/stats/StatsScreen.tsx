import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppText, Card, MonoText, Screen } from '@/components/Primitives';
import { QuipLoader } from '@/components/QuipLoader';
import { XpBar } from '@/components/XpBar';
import { FlameIcon } from '@/components/icons';
import { repService } from '@/services/rep.service';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { scoreColor } from '@/lib/scores';
import type { StatsPayload } from '@/types';

const MAX_BAR_HEIGHT = 48;
const RECENT_LIMIT = 8;

export function StatsScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<StatsPayload | null>(null);

  const fetch = useCallback(async () => {
    try {
      setStats(await repService.getStats());
    } catch {
      // The api layer surfaces the error modal; the loader stays up.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  if (!stats) {
    return (
      <Screen style={styles.loading}>
        <QuipLoader pool={THINKING_QUIPS} size={160} />
      </Screen>
    );
  }

  const { totals, streak, history, recent } = stats;
  const maxXp = history.reduce((max, day) => Math.max(max, day.xpEarned), 0);
  const barHeight = (xpEarned: number) =>
    maxXp <= 0 ? 3 : Math.max(3, Math.round((xpEarned / maxXp) * MAX_BAR_HEIGHT));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <AppText style={styles.title}>{strings.stats.title}</AppText>

        {/* Level */}
        <XpBar level={stats.level} />

        {/* Totals */}
        <Card style={styles.tilesCard}>
          <View style={styles.tile}>
            <MonoText weight="bold" style={styles.tileValue}>
              {totals.reps}
            </MonoText>
            <AppText dim style={styles.tileLabel}>
              Reps
            </AppText>
          </View>
          <View style={styles.tile}>
            <MonoText
              weight="bold"
              color={
                totals.averageScore === null
                  ? undefined
                  : scoreColor(totals.averageScore, theme)
              }
              style={styles.tileValue}
            >
              {totals.averageScore === null ? '—' : totals.averageScore.toFixed(1)}
            </MonoText>
            <AppText dim style={styles.tileLabel}>
              Avg score
            </AppText>
          </View>
          <View style={styles.tile}>
            <MonoText
              weight="bold"
              color={
                totals.bestScore === null
                  ? undefined
                  : scoreColor(totals.bestScore, theme)
              }
              style={styles.tileValue}
            >
              {totals.bestScore === null ? '—' : totals.bestScore}
            </MonoText>
            <AppText dim style={styles.tileLabel}>
              Best score
            </AppText>
          </View>
        </Card>

        {/* Streak */}
        <Card style={styles.streakCard}>
          <FlameIcon size={28} color={theme.accent} />
          <MonoText weight="bold" color={theme.accent} style={styles.streakNumber}>
            {streak.current}
          </MonoText>
          <AppText style={styles.streakLabel}>{strings.home.dayStreak}</AppText>
          <View style={styles.streakRight}>
            <MonoText
              weight="medium"
              color={theme.textSecondary}
              style={styles.streakBest}
            >
              best {streak.longest}
            </MonoText>
            <MonoText
              weight="medium"
              color={theme.textDim}
              style={styles.streakFreezes}
            >
              {streak.freezesAvailable} ❄ banked
            </MonoText>
          </View>
        </Card>

        {/* 30-day history */}
        <View style={styles.section}>
          <MonoText
            weight="semiBold"
            color={theme.textSecondary}
            style={styles.kicker}
          >
            30 DAYS
          </MonoText>
          {history.length === 0 ? (
            <AppText dim style={styles.emptyText}>
              No reps yet. The bank is untouched.
            </AppText>
          ) : (
            <View style={styles.barsRow}>
              {history.map((day) => (
                <View
                  key={day.date}
                  style={[
                    styles.bar,
                    { height: barHeight(day.xpEarned), backgroundColor: theme.xp },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Recent attempts */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <MonoText
              weight="semiBold"
              color={theme.textSecondary}
              style={styles.kicker}
            >
              RECENT
            </MonoText>
            {recent.slice(0, RECENT_LIMIT).map((row) => (
              <Card key={row.attemptId} style={styles.recentRow}>
                <AppText numberOfLines={1} style={styles.recentTitle}>
                  {row.questionTitle}
                </AppText>
                <MonoText
                  weight="bold"
                  color={scoreColor(row.score, theme)}
                  style={styles.recentScore}
                >
                  {row.score}
                </MonoText>
                <MonoText
                  weight="medium"
                  color={theme.textDim}
                  style={styles.recentXp}
                >
                  +{row.xpEarned} XP
                </MonoText>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 14, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  tilesCard: { padding: 16, flexDirection: 'row' },
  tile: { flex: 1, alignItems: 'center', gap: 4 },
  tileValue: { fontSize: 22 },
  tileLabel: { fontSize: 11 },
  streakCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakNumber: { fontSize: 26 },
  streakLabel: { fontSize: 13, fontWeight: '600' },
  streakRight: { marginLeft: 'auto', alignItems: 'flex-end', gap: 2 },
  streakBest: { fontSize: 12 },
  streakFreezes: { fontSize: 11 },
  section: { gap: 10 },
  kicker: { fontSize: 10.5, letterSpacing: 1.5 },
  emptyText: { fontSize: 13 },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 48,
  },
  bar: { width: 6, borderRadius: 3 },
  recentRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  recentScore: { fontSize: 14 },
  recentXp: { fontSize: 11 },
});
