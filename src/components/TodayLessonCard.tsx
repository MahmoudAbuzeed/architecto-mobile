import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Card, MonoText, PrimaryButton } from './Primitives';
import { FlameOutlineIcon, PlayIcon } from './icons';
import { useDailyStore } from '@/store/daily.store';
import { useTracksStore } from '@/store/tracks.store';
import { useTheme } from '@/theme/useTheme';
import { ELEVATED_FG } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import { todayLocalISO } from '@/lib/dates';
import type { RootStackParamList, TabParamList } from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Home's daily-lesson card — the primary sibling in the "TODAY" carousel. Flex-
 * fills its fixed-height slot with the CTA pinned to the bottom so it lines up
 * with the voice-rep card. Renders nothing on old backends / before a track is
 * picked, so those users see an unchanged Home.
 */
export function TodayLessonCard() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const daily = useDailyStore((s) => s.daily);
  const fetchedFor = useDailyStore((s) => s.fetchedFor);
  const isLoading = useDailyStore((s) => s.isLoading);
  const unsupported = useDailyStore((s) => s.unsupported);
  const primaryTrack = useTracksStore((s) => s.tracks?.primaryTrack);

  if (unsupported || !primaryTrack) return null;

  const fresh = fetchedFor?.date === todayLocalISO();
  const showLoading = !daily || !fresh || (isLoading && !daily);

  const header = (
    <View style={styles.headerRow}>
      <MonoText
        weight="semiBold"
        color={ELEVATED_FG.dim}
        numberOfLines={1}
        style={styles.kicker}
      >
        {strings.home.todaysLesson}
      </MonoText>
      <MonoText
        weight="medium"
        color={ELEVATED_FG.dim}
        numberOfLines={1}
        style={styles.meta}
      >
        {strings.home.lessonMeta(daily?.lesson?.estimatedMinutes ?? 5)}
      </MonoText>
    </View>
  );

  if (showLoading) {
    return (
      <Card elevated style={styles.card}>
        {header}
        <AppText style={styles.body}>{strings.home.preparingLesson}</AppText>
      </Card>
    );
  }

  if (daily.status === 'track_complete') {
    return (
      <Card elevated style={styles.card}>
        {header}
        <AppText numberOfLines={3} style={styles.body}>
          {strings.home.lessonTrackCompleteBody}
        </AppText>
        <View style={styles.spacer} />
        <PrimaryButton
          height={48}
          inverted
          label={strings.daily.pickNewTrack}
          onPress={() => navigation.navigate('TrackPicker', { context: 'switch' })}
        />
      </Card>
    );
  }

  const completed = daily.status === 'completed';

  return (
    <Card elevated style={styles.card}>
      {header}
      <AppText numberOfLines={2} style={styles.title}>
        {daily.topic?.title ?? daily.lesson?.title}
      </AppText>
      {completed ? (
        <AppText secondary numberOfLines={2} style={styles.body}>
          {daily.attempt
            ? strings.home.lessonDoneSub(daily.attempt.score, daily.attempt.total)
            : strings.home.lessonDoneTitle}
        </AppText>
      ) : (
        <>
          {daily.lesson?.hook ? (
            <AppText secondary numberOfLines={2} style={styles.body}>
              {daily.lesson.hook}
            </AppText>
          ) : null}
          <View style={styles.streakRow}>
            <FlameOutlineIcon size={14} color={theme.accent} />
            <AppText secondary style={styles.streakText}>
              {strings.home.lessonStreakDay(daily.streak.current)}
            </AppText>
          </View>
        </>
      )}
      <View style={styles.spacer} />
      <PrimaryButton
        height={48}
        inverted
        icon={completed ? undefined : <PlayIcon size={14} color="#171717" />}
        label={completed ? strings.home.reviewLesson : strings.home.startLesson}
        onPress={() => navigation.navigate('DailyLesson')}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kicker: { fontSize: 10.5, letterSpacing: 1.5, flexShrink: 1, minWidth: 0 },
  meta: { fontSize: 11, flexShrink: 0, marginLeft: 10 },
  title: { fontSize: 19, fontWeight: '700', lineHeight: 24, color: ELEVATED_FG.text },
  body: { fontSize: 13, lineHeight: 19.5, color: ELEVATED_FG.secondary, marginTop: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  streakText: { fontSize: 12.5, color: ELEVATED_FG.secondary },
  spacer: { flex: 1, minHeight: 12 },
});
