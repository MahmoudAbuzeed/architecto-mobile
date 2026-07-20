import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckIcon } from './icons';
import { MonoText } from './Primitives';
import { useTheme } from '@/theme/useTheme';
import type { WeekDay } from '@/types';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function labelFor(date: string): string {
  // date is UTC YYYY-MM-DD; parse as UTC so the label matches the server day.
  const d = new Date(`${date}T00:00:00Z`);
  return DAY_LETTERS[d.getUTCDay()] ?? '·';
}

/** The 7-day strip under the streak card (design 1b/1h). */
export function WeekStrip({ week }: { week: WeekDay[] }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {week.map((d) => {
        const done = d.status === 'done';
        const today = d.status === 'today';
        return (
          <View key={d.date} style={styles.day}>
            <MonoText weight="medium" color={theme.textDim} style={styles.label}>
              {labelFor(d.date)}
            </MonoText>
            <View
              style={[
                styles.dot,
                done && { backgroundColor: theme.accent },
                today && {
                  backgroundColor: theme.accentSoft,
                  borderWidth: 1,
                  borderColor: theme.accent,
                },
                !done &&
                  !today && {
                    backgroundColor: theme.dark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f5f5f5',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: theme.borderStrong,
                  },
              ]}
            >
              {done && (
                <CheckIcon
                  size={12}
                  color={theme.dark ? '#17181c' : '#ffffff'}
                  strokeWidth={3.4}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  day: { alignItems: 'center', gap: 5 },
  label: { fontSize: 10 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
