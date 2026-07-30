import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AppText, Card, MonoText } from './Primitives';
import { ChevronRightIcon, CircleCheckIcon, MicIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { DIFFICULTY_COLORS } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import type { DrillRow } from '@/types';

/**
 * One drill row (shared by AllDrills + CategoryTopics): title, difficulty,
 * the constant ~5 MIN estimate, voice badge, and done/chevron affordance.
 */
export function DrillRowCard({
  drill,
  onPress,
  index = 0,
}: {
  drill: DrillRow;
  onPress: () => void;
  /** List position — staggers the entering animation like the old list. */
  index?: number;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 10) * 40).duration(300)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card style={styles.row}>
          <View style={styles.rowBody}>
            <AppText style={styles.rowTitle}>{drill.title}</AppText>
            <View style={styles.metaRow}>
              <MonoText
                weight="semiBold"
                color={DIFFICULTY_COLORS[drill.difficulty]}
                style={styles.diff}
              >
                {drill.difficulty.toUpperCase()}
              </MonoText>
              <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
                {strings.drills.estimate}
              </MonoText>
              <View style={styles.voiceBadge}>
                <MicIcon size={9} color={theme.textDim} strokeWidth={2.6} />
                <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
                  {strings.drills.voice}
                </MonoText>
              </View>
            </View>
          </View>
          {drill.done ? (
            <CircleCheckIcon size={18} color={theme.emerald} />
          ) : (
            <ChevronRightIcon size={16} color={theme.textDim} />
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 5 },
  rowTitle: { fontSize: 14.5, fontWeight: '600', lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diff: { fontSize: 10, letterSpacing: 0.6 },
  meta: { fontSize: 10.5 },
  voiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
