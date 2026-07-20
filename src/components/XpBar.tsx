import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, MonoText } from './Primitives';
import { formatLevelProgress, formatXp, levelFraction } from '@/lib/format';
import { useTheme } from '@/theme/useTheme';
import type { LevelProgress } from '@/types';

/** The XP level card (design 1b): "Level 4 · Load Balancer · 1,240/1,500 XP". */
export function XpBar({ level }: { level: LevelProgress }) {
  const theme = useTheme();
  const fraction = levelFraction(
    level.totalXp,
    level.currentLevelXp,
    level.nextLevelXp,
  );
  const toNext =
    level.nextLevelXp === null ? null : level.nextLevelXp - level.totalXp;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText style={styles.title}>
          Level {level.level} · {level.levelName}
        </AppText>
        <MonoText weight="medium" color={theme.textSecondary} style={styles.xp}>
          {formatLevelProgress(level.totalXp, level.nextLevelXp)}
        </MonoText>
      </View>
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : '#f5f5f5',
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            { width: `${fraction * 100}%`, backgroundColor: theme.xp },
          ]}
        />
      </View>
      {toNext !== null && (
        <AppText dim style={styles.footer}>
          {formatXp(toNext)} XP to Level {level.level + 1}.
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 13, fontWeight: '600' },
  xp: { fontSize: 12 },
  track: { height: 7, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  footer: { fontSize: 11.5 },
});
