import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { AppText, MonoText } from '../Primitives';
import { PressableScale } from '../PressableScale';
import { GlowHalo } from '../GlowHalo';
import { CheckIcon, LockIcon, PlayIcon } from '../icons';
import { useTheme } from '@/theme/useTheme';
import { NODE_SIZE, TODAY_NODE_SIZE } from './journeyLayout';
import type { JourneyNodeState } from './journeyLayout';
import type { JourneyCopy } from '@/i18n/journey-copy';

/**
 * One node on the category journey path: a disc whose look encodes its state,
 * with the topic title (and, for today's node, a START / DONE pill) beneath.
 * Positioned absolutely by [[JourneyPath]] — this component only draws itself
 * centered in a fixed-width column.
 */
export function JourneyNode({
  title,
  state,
  accent,
  rtl,
  index,
  copy,
  onPress,
}: {
  title: string;
  state: JourneyNodeState;
  accent: string;
  rtl: boolean;
  index: number;
  copy: JourneyCopy;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const isToday = state === 'today';
  const size = isToday ? TODAY_NODE_SIZE : NODE_SIZE;
  const dimmed = state === 'proGated';

  // Disc surface + glyph per state.
  let disc: React.ReactNode;
  if (state === 'completed' || state === 'todayDone') {
    disc = (
      <View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: accent },
        ]}
      >
        <CheckIcon size={22} color="#fff" />
      </View>
    );
  } else if (state === 'today') {
    disc = (
      <View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: accent },
        ]}
      >
        <PlayIcon size={26} color="#fff" />
      </View>
    );
  } else if (state === 'locked') {
    disc = (
      <View
        style={[
          styles.disc,
          styles.discOutline,
          { width: size, height: size, borderRadius: size / 2, borderColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <LockIcon size={18} color={theme.textDim} />
      </View>
    );
  } else if (state === 'proGated') {
    disc = (
      <View
        style={[
          styles.disc,
          styles.discOutline,
          { width: size, height: size, borderRadius: size / 2, borderColor: `${accent}66`, backgroundColor: theme.card },
        ]}
      >
        <LockIcon size={18} color={accent} />
      </View>
    );
  } else {
    // available (Pro) — an open, startable node.
    disc = (
      <View
        style={[
          styles.disc,
          styles.discOutline,
          { width: size, height: size, borderRadius: size / 2, borderColor: theme.borderStrong, backgroundColor: theme.card },
        ]}
      >
        <View style={[styles.hollow, { borderColor: theme.textSecondary }]} />
      </View>
    );
  }

  const pill =
    state === 'today' ? (
      <View style={[styles.pill, { backgroundColor: accent }]}>
        <MonoText weight="bold" color="#fff" style={styles.pillText}>
          {copy.startPill}
        </MonoText>
      </View>
    ) : state === 'todayDone' ? (
      <View style={[styles.pill, { backgroundColor: `${accent}22` }]}>
        <MonoText weight="bold" color={accent} style={styles.pillText}>
          {copy.doneTodayPill}
        </MonoText>
      </View>
    ) : null;

  const body = (
    <View style={[styles.wrap, dimmed && styles.dimmed]}>
      <View style={styles.discWrap}>
        {isToday && <GlowHalo size={size * 2.2} color={accent} />}
        {disc}
      </View>
      <AppText
        secondary={state === 'locked'}
        numberOfLines={2}
        style={[styles.title, isToday && styles.titleToday, rtl && styles.rtl]}
      >
        {title}
      </AppText>
      {pill}
    </View>
  );

  if (!onPress) return body;

  const Wrapper = reduced ? View : Animated.View;
  const wrapperProps = reduced
    ? {}
    : { entering: FadeInUp.delay(Math.min(index, 12) * 30).duration(280) };

  return (
    <Wrapper {...wrapperProps}>
      <PressableScale onPress={onPress} haptics>
        {body}
      </PressableScale>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  dimmed: { opacity: 0.55 },
  discWrap: { alignItems: 'center', justifyContent: 'center' },
  disc: { alignItems: 'center', justifyContent: 'center' },
  discOutline: { borderWidth: 2 },
  hollow: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  title: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 150,
  },
  titleToday: { fontSize: 14, fontWeight: '700' },
  rtl: { writingDirection: 'rtl' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: { fontSize: 10, letterSpacing: 1 },
});
