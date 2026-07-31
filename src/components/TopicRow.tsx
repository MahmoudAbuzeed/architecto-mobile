import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, MonoText } from './Primitives';
import { CheckIcon, ChevronRightIcon, LockIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import type { TopicRow as TopicRowData } from '@/types';

/**
 * One topic in the category list. The glyph tells the story: lock (locked),
 * hollow dot (available), check (completed). When `onPress` is provided and the
 * topic isn't locked, the row opens that topic's lesson + MCQ (Learn-tab
 * browse); locked rows stay inert. `proGated` marks a row that a free user can
 * tap but only unlocks the paywall (browsing any topic is a Pro feature) — it
 * shows a small PRO chip so the upsell reads as intentional, not broken.
 */
export function TopicRow({
  topic,
  rtl,
  onPress,
  proGated,
}: {
  topic: TopicRowData;
  rtl?: boolean;
  onPress?: () => void;
  proGated?: boolean;
}) {
  const theme = useTheme();
  const locked = topic.status === 'locked';
  const completed = topic.status === 'completed';
  const tappable = !!onPress && !locked;
  const prereqTitles = topic.missingPrerequisites
    ?.map((p) => p.title)
    .filter(Boolean)
    .join(', ');

  const inner = (
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
      {tappable && proGated && (
        <View style={[styles.proChip, { borderColor: theme.accent }]}>
          <MonoText weight="bold" color={theme.accent} style={styles.proChipText}>
            {strings.learn.proBadge}
          </MonoText>
        </View>
      )}
      {tappable && <ChevronRightIcon size={15} color={theme.textDim} />}
    </View>
  );

  if (!tappable) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {inner}
    </Pressable>
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
  proChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  proChipText: { fontSize: 9, letterSpacing: 1 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
});
