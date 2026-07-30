import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

/**
 * Thin determinate bar — same track/fill treatment as XpBar, minus the card,
 * so track and category progress read consistently everywhere.
 */
export function ProgressBar({
  fraction,
  color,
  height = 6,
}: {
  /** [0..1]; clamped. */
  fraction: number;
  /** Fill color; defaults to the primary action surface. */
  color?: string;
  height?: number;
}) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : '#f5f5f5',
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: color ?? theme.action,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
