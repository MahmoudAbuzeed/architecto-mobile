import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, MonoText } from './Primitives';
import { CheckIcon, LockIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import type { TopicRow as TopicRowData } from '@/types';

/**
 * One topic in the category list. Read-only on mobile — lessons live on the
 * web; the glyph tells the story: lock (locked), hollow dot (available),
 * check (completed).
 */
export function TopicRow({ topic, rtl }: { topic: TopicRowData; rtl?: boolean }) {
  const theme = useTheme();
  const locked = topic.status === 'locked';
  const completed = topic.status === 'completed';
  const prereqTitles = topic.missingPrerequisites
    ?.map((p) => p.title)
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.glyph}>
        {completed ? (
          <CheckIcon size={14} color={theme.emerald} />
        ) : locked ? (
          <LockIcon size={14} color={theme.textDim} />
        ) : (
          <View style={[styles.dot, { borderColor: theme.textSecondary }]} />
        )}
      </View>
      <View style={styles.body}>
        <AppText
          secondary={locked}
          style={[styles.title, rtl && styles.rtlText]}
          numberOfLines={2}
        >
          {topic.title}
        </AppText>
        {locked && !!prereqTitles && (
          <AppText dim style={[styles.prereqs, rtl && styles.rtlText]}>
            {strings.learn.needsPrereqs(prereqTitles)}
          </AppText>
        )}
      </View>
      {typeof topic.estimatedMinutes === 'number' && (
        <MonoText weight="medium" color={theme.textDim} style={styles.minutes}>
          {topic.estimatedMinutes} MIN
        </MonoText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  glyph: { width: 18, alignItems: 'center' },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.6,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
  prereqs: { fontSize: 11, lineHeight: 15 },
  minutes: { fontSize: 10 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
});
