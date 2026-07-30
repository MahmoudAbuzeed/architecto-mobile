import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Screen } from '@/components/Primitives';
import { TrackCard } from '@/components/TrackCard';
import { QuipLoader } from '@/components/QuipLoader';
import { CloseIcon } from '@/components/icons';
import { useTracksStore } from '@/store/tracks.store';
import { toAppError } from '@/lib/api-error';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TrackPicker'>;

/**
 * Modal track picker: every track with its hex accent and progress; tapping
 * one sets it as the primary track, refreshes tracks/detail/Home, and closes.
 */
export function TrackPickerScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const firstPick = params.context === 'first-pick';

  const isStart = params.context === 'start';

  const tracks = useTracksStore((s) => s.tracks);
  const fetchTracks = useTracksStore((s) => s.fetchTracks);
  const selectTrack = useTracksStore((s) => s.selectTrack);
  const startTrack = useTracksStore((s) => s.startTrack);

  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTracks();
  }, [fetchTracks]);

  const isOpen = useCallback(
    (slug: string) =>
      tracks?.primaryTrack === slug || !!tracks?.additionalTracks.includes(slug),
    [tracks],
  );

  const onPick = useCallback(
    async (slug: string) => {
      if (selecting) return;
      // In 'start' mode, tapping an already-open track just closes.
      if (isStart && isOpen(slug)) {
        navigation.goBack();
        return;
      }
      setSelecting(slug);
      setError(null);
      try {
        if (isStart) {
          await startTrack(slug);
        } else {
          await selectTrack(slug);
        }
        navigation.goBack();
      } catch (e) {
        setError(toAppError(e).message);
        setSelecting(null);
      }
    },
    [selecting, isStart, isOpen, startTrack, selectTrack, navigation],
  );

  const title = isStart
    ? strings.trackPicker.startTitle
    : firstPick
      ? strings.trackPicker.firstPickTitle
      : strings.trackPicker.switchTitle;
  const body = isStart
    ? strings.trackPicker.startBody
    : firstPick
      ? strings.trackPicker.firstPickBody
      : strings.trackPicker.switchBody;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText secondary style={styles.subtitle}>
            {body}
          </AppText>
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <CloseIcon size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      {error && (
        <AppText secondary style={styles.errorText}>
          {error}
        </AppText>
      )}

      {!tracks ? (
        <View style={styles.loading}>
          <QuipLoader pool={THINKING_QUIPS} size={160} />
        </View>
      ) : selecting ? (
        <View style={styles.loading}>
          <QuipLoader pool={THINKING_QUIPS} size={160} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {tracks.tracks.map((track) => (
            <TrackCard
              key={track.track}
              track={track}
              disabled={!!selecting}
              onPress={() => void onPick(track.track)}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  headerText: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, lineHeight: 18.5 },
  errorText: { fontSize: 12, lineHeight: 17, paddingHorizontal: 20, paddingTop: 6 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingTop: 12, gap: 10, paddingBottom: 28 },
});
