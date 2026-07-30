import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Card, MonoText, Screen } from '@/components/Primitives';
import { StreakFlame } from '@/components/StreakFlame';
import { WeekStrip } from '@/components/WeekStrip';
import { XpBar } from '@/components/XpBar';
import { ContinueTrackCard } from '@/components/ContinueTrackCard';
import { DailyCarousel } from '@/components/DailyCarousel';
import { OpenTrackCard } from '@/components/OpenTrackCard';
import { QuipLoader } from '@/components/QuipLoader';
import { useHomeStore } from '@/store/home.store';
import { useTracksStore } from '@/store/tracks.store';
import { useDailyStore } from '@/store/daily.store';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { formatHomeDate, greetingFor, initials } from '@/lib/format';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const home = useHomeStore((s) => s.home);
  const fetch = useHomeStore((s) => s.fetch);
  const tracks = useTracksStore((s) => s.tracks);
  const fetchTracks = useTracksStore((s) => s.fetchTracks);
  const fetchDaily = useDailyStore((s) => s.fetch);
  const user = useAuthStore((s) => s.user);

  useFocusEffect(
    useCallback(() => {
      // All three are cached/single-flight, so this is cheap on re-focus.
      void fetch();
      void fetchTracks();
      void fetchDaily();
    }, [fetch, fetchTracks, fetchDaily]),
  );

  if (!home) {
    return (
      <Screen style={styles.loading}>
        <QuipLoader pool={THINKING_QUIPS} size={160} />
      </Screen>
    );
  }

  const { streak, level } = home;
  const now = new Date();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.headerRow}>
          <View>
            <AppText secondary style={styles.date}>
              {formatHomeDate(now)}
            </AppText>
            <AppText style={styles.greeting}>
              {greetingFor(now, user?.name)}
            </AppText>
          </View>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.card, borderColor: theme.borderStrong },
            ]}
          >
            <AppText secondary style={styles.avatarText}>
              {initials(user?.name)}
            </AppText>
          </View>
        </View>

        {/* Streak + week (one block) */}
        <Card style={styles.streakCard}>
          <View style={styles.streakTop}>
            <StreakFlame size={48} />
            <View style={styles.streakInfo}>
              <View style={styles.streakNumberRow}>
                <MonoText weight="bold" color={theme.accent} style={styles.streakNumber}>
                  {streak.current}
                </MonoText>
                <AppText style={styles.streakLabel}>{strings.home.dayStreak}</AppText>
              </View>
              <AppText secondary style={styles.streakQuip} numberOfLines={1}>
                {strings.home.streakQuip}
              </AppText>
            </View>
          </View>
          <WeekStrip week={streak.week} />
        </Card>

        {/* TODAY — the daily activities carousel */}
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={styles.sectionKicker}
        >
          {strings.home.todaySection}
        </MonoText>
        <DailyCarousel />

        {/* Your tracks */}
        {tracks ? (
          tracks.primaryTrack ? (
            <View style={styles.tracksSection}>
              <MonoText
                weight="semiBold"
                color={theme.textSecondary}
                style={styles.sectionKicker}
              >
                {strings.home.yourTracks}
              </MonoText>
              {tracks.tracks
                .filter((t) => t.isPrimary || t.isAdditional)
                .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
                .map((t) => <OpenTrackCard key={t.track} summary={t} />)}
              <Pressable
                onPress={() =>
                  navigation.navigate('TrackPicker', { context: 'start' })
                }
                style={({ pressed }) => [
                  styles.addTrackRow,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <AppText secondary style={styles.addTrackText}>
                  {strings.home.startAnotherTrack}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <ContinueTrackCard data={null} />
          )
        ) : (
          <ContinueTrackCard data={home.continueTrack} />
        )}

        {/* Level */}
        <XpBar level={level} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 28 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: { fontSize: 12.5 },
  greeting: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '600' },
  streakCard: { padding: 16, gap: 14 },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakInfo: { flex: 1, minWidth: 0 },
  streakNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  streakNumber: { fontSize: 26 },
  streakLabel: { fontSize: 13, fontWeight: '600' },
  streakQuip: { fontSize: 12, lineHeight: 17 },
  sectionKicker: { fontSize: 10.5, letterSpacing: 1.5, marginBottom: -4 },
  tracksSection: { gap: 10 },
  addTrackRow: { paddingVertical: 6, alignItems: 'center' },
  addTrackText: { fontSize: 13, fontWeight: '600' },
});
