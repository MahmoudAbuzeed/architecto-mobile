import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Card, MonoText } from './Primitives';
import { ProgressBar } from './ProgressBar';
import { ChevronRightIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { trackEmoji } from '@/lib/trackVisuals';
import type { TrackSummary } from '@/types';
import type { RootStackParamList, TabParamList } from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * One open track row in Home's "YOUR TRACKS" section. Tapping it opens the
 * track's topics in the Learn tab. It deliberately does NOT jump into a voice
 * drill — the learning path is the daily lesson (the Home hero for the primary
 * track); voice drills live in the Learn tab as separate practice.
 */
export function OpenTrackCard({ summary }: { summary: TrackSummary }) {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const fraction =
    summary.topicsTotal > 0 ? summary.topicsCompleted / summary.topicsTotal : 0;

  const openTrack = () => {
    if (summary.isPrimary) {
      navigation.navigate('Learn', { screen: 'TrackOverview' });
    } else {
      navigation.navigate('Learn', {
        screen: 'TrackOverview',
        params: { track: summary.track },
      });
    }
  };

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={openTrack}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.iconDisc, { backgroundColor: `${summary.hex}2E` }]}>
          <AppText style={styles.icon}>{trackEmoji(summary.track)}</AppText>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText style={styles.label} numberOfLines={1}>
              {summary.label}
            </AppText>
            {summary.isPrimary && (
              <MonoText weight="semiBold" color={summary.hex} style={styles.tag}>
                {strings.home.primaryTag}
              </MonoText>
            )}
          </View>
          <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
            {strings.learn.topicsProgress(
              summary.topicsCompleted,
              summary.topicsTotal,
            )}
          </MonoText>
          <ProgressBar fraction={fraction} color={summary.hex} height={5} />
        </View>
        <ChevronRightIcon size={15} color={theme.textDim} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  body: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  tag: { fontSize: 9, letterSpacing: 1.2 },
  meta: { fontSize: 10.5 },
});
