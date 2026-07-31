import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TodayLessonCard } from './TodayLessonCard';
import { useDailyStore } from '@/store/daily.store';
import { useTracksStore } from '@/store/tracks.store';

const CARD_H = 250;

/**
 * "TODAY" — the day's single five-minute activity: the info + MCQ micro-lesson.
 * The old voice-rep card was retired (the app is one daily lesson now), so this
 * is no longer a swipeable pager — just a fixed-height slot for the lesson card.
 * Renders nothing when there's no lesson (old backend / no track picked); Home
 * gates its "TODAY" kicker on the same condition so they hide in lockstep.
 */
export function DailyCarousel() {
  const unsupported = useDailyStore((s) => s.unsupported);
  const primaryTrack = useTracksStore((s) => s.tracks?.primaryTrack);
  if (unsupported || !primaryTrack) return null;

  return (
    <View style={styles.slot}>
      <TodayLessonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: CARD_H },
});
