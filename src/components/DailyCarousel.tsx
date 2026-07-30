import React, { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { TodayLessonCard } from './TodayLessonCard';
import { DailyRepCard } from './DailyRepCard';
import { useDailyStore } from '@/store/daily.store';
import { useTracksStore } from '@/store/tracks.store';
import { useTheme } from '@/theme/useTheme';

const H_PAD = 20; // matches HomeScreen content padding
const GAP = 12;
const CARD_H = 250;

/**
 * "TODAY" — the day's two five-minute activities (the lesson + the voice rep)
 * as a swipeable, snapping pager with a peek of the next card and page dots.
 * Groups them as sibling daily habits and reclaims the vertical space the two
 * stacked hero cards used to take. Falls back to a single full-width card when
 * only one activity is available (old backend / no track picked).
 */
export function DailyCarousel() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const unsupported = useDailyStore((s) => s.unsupported);
  const primaryTrack = useTracksStore((s) => s.tracks?.primaryTrack);
  const [page, setPage] = useState(0);

  const showLesson = !unsupported && !!primaryTrack;

  const cards: React.ReactNode[] = [];
  if (showLesson) cards.push(<TodayLessonCard key="lesson" />);
  cards.push(<DailyRepCard key="rep" />);

  // Only one activity → a normal full-width card, no pager chrome.
  if (cards.length < 2) {
    return <View>{cards[0]}</View>;
  }

  const cardW = width - H_PAD * 2 - 20; // leave ~28px peek of the next card
  const interval = cardW + GAP;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / interval));
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {cards.map((card, i) => (
          <View key={i} style={{ width: cardW, height: CARD_H }}>
            {card}
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === page ? theme.text : theme.borderStrong,
                width: i === page ? 18 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Break out of the parent's 20px content padding so cards can scroll edge to
  // edge; the contentContainerStyle re-adds the padding for the first card.
  scroll: { marginHorizontal: -H_PAD },
  content: { paddingHorizontal: H_PAD, gap: GAP },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: { height: 6, borderRadius: 3 },
});
