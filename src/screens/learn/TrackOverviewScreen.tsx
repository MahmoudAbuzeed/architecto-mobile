import React, { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  AppText,
  Card,
  Chip,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { ProgressBar } from '@/components/ProgressBar';
import { QuipLoader } from '@/components/QuipLoader';
import { ChevronRightIcon, FlameOutlineIcon } from '@/components/icons';
import { useTracksStore } from '@/store/tracks.store';
import { useDailyStore } from '@/store/daily.store';
import { useDailyDose } from '@/hooks/useDailyDose';
import { useSettingsStore } from '@/store/settings.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { journeyCopyFor } from '@/i18n/journey-copy';
import { THINKING_QUIPS } from '@/lib/quips';
import { trackEmoji, categoryInitial } from '@/lib/trackVisuals';
import type {
  LearnStackParamList,
  RootStackParamList,
} from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<LearnStackParamList, 'TrackOverview'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Route = RouteProp<LearnStackParamList, 'TrackOverview'>;

/**
 * Learn tab landing: your primary track's header + progress and its
 * categories. MMKV warm-paints the cached payload instantly; a focus fetch
 * refreshes it. No track yet (or no tracks endpoint) funnels to the picker.
 */
export function TrackOverviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const tracks = useTracksStore((s) => s.tracks);
  const detail = useTracksStore((s) => s.detail);
  const isLoading = useTracksStore((s) => s.isLoading);
  const error = useTracksStore((s) => s.error);
  const fetchTracks = useTracksStore((s) => s.fetchTracks);
  const fetchDetail = useTracksStore((s) => s.fetchDetail);
  const selectTrack = useTracksStore((s) => s.selectTrack);
  const fetchDaily = useDailyStore((s) => s.fetch);
  const dose = useDailyDose();
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const copy = journeyCopyFor(contentLanguage);

  // Which track this screen shows: the route param (an additional track opened
  // from Home) or the primary. `detail` is a single slot, so navigating an
  // additional track overwrites it; it re-fetches on next focus — acceptable v1.
  const viewTrack = route.params?.track ?? tracks?.primaryTrack ?? null;
  const isPrimaryView = !!viewTrack && viewTrack === tracks?.primaryTrack;

  useFocusEffect(
    useCallback(() => {
      void fetchTracks();
    }, [fetchTracks]),
  );

  useEffect(() => {
    if (viewTrack) void fetchDetail(viewTrack);
  }, [viewTrack, fetchDetail]);

  // Warm the daily dose so the TODAY card can point at today's node.
  useEffect(() => {
    void fetchDaily();
  }, [fetchDaily]);

  // First load, nothing cached yet.
  if (!tracks && !error) {
    return (
      <Screen style={styles.loading}>
        <QuipLoader pool={THINKING_QUIPS} size={160} />
      </Screen>
    );
  }

  // No track picked (or the tracks endpoint isn't there yet).
  if (!viewTrack) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.title}>{strings.tabs.learn}</AppText>
          <Card style={styles.emptyCard}>
            <AppText style={styles.emptyTitle}>
              {strings.learn.noTrackTitle}
            </AppText>
            <AppText secondary style={styles.emptyBody}>
              {error ? strings.learn.loadError : strings.learn.noTrackBody}
            </AppText>
            {!error && (
              <PrimaryButton
                height={46}
                label={strings.learn.noTrackCta}
                onPress={() =>
                  navigation.navigate('TrackPicker', { context: 'first-pick' })
                }
              />
            )}
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  const header = detail && detail.track === viewTrack ? detail : null;
  const summary = tracks?.tracks.find((t) => t.track === viewTrack);
  const label = header?.label ?? summary?.label ?? '';
  const hex = header?.hex ?? summary?.hex ?? theme.accent;
  const topicsCompleted = header?.topicsCompleted ?? summary?.topicsCompleted ?? 0;
  const topicsTotal = header?.topicsTotal ?? summary?.topicsTotal ?? 0;
  const percent = header?.percentComplete ?? summary?.percentComplete ?? 0;
  const fraction = topicsTotal > 0 ? topicsCompleted / topicsTotal : 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Track header */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <MonoText
              weight="semiBold"
              color={theme.textSecondary}
              style={styles.kicker}
            >
              {strings.home.yourTrack}
            </MonoText>
            <AppText style={styles.title}>
              {`${trackEmoji(viewTrack)} `}
              {label}
            </AppText>
          </View>
          <View style={styles.chipRow}>
            {isPrimaryView ? (
              <Chip
                label={strings.learn.switchChip}
                onPress={() =>
                  navigation.navigate('TrackPicker', { context: 'switch' })
                }
              />
            ) : (
              <Chip
                label={strings.trackPicker.makePrimary}
                onPress={() => void selectTrack(viewTrack)}
              />
            )}
          </View>
        </View>

        {/* Progress */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <MonoText weight="medium" color={theme.textSecondary} style={styles.progressText}>
              {strings.learn.topicsProgress(topicsCompleted, topicsTotal)}
            </MonoText>
            <MonoText weight="bold" color={hex} style={styles.percent}>
              {Math.round(percent)}%
            </MonoText>
          </View>
          <ProgressBar fraction={fraction} color={hex} height={7} />
        </Card>

        {/* TODAY — deep-links to the category path, auto-scrolled to the node.
            Primary track only; hidden on old backends / track complete. */}
        {isPrimaryView &&
          dose.isFresh &&
          !dose.unsupported &&
          !!dose.todaySlug &&
          !dose.trackComplete && (
            <Card style={[styles.todayCard, { borderColor: `${hex}55` }]}>
              <MonoText weight="semiBold" color={hex} style={styles.todayKicker}>
                {copy.todayKicker}
              </MonoText>
              <AppText style={styles.todayTitle} numberOfLines={2}>
                {dose.todayTitle}
              </AppText>
              {dose.doseCompleted ? (
                <View style={styles.todayDoneRow}>
                  <FlameOutlineIcon size={15} color={hex} />
                  <AppText secondary style={styles.todayDoneText}>
                    {copy.doneTodaySub(dose.streakCurrent)}
                  </AppText>
                </View>
              ) : (
                <PrimaryButton
                  height={46}
                  label={copy.continueCta}
                  onPress={() =>
                    dose.todayCategory &&
                    navigation.navigate('CategoryTopics', {
                      category: dose.todayCategory,
                      name: dose.todayCategoryName ?? '',
                      hex,
                    })
                  }
                />
              )}
            </Card>
          )}

        {/* Categories */}
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={styles.sectionKicker}
        >
          {strings.learn.categories}
        </MonoText>
        {!header && isLoading && (
          <View style={styles.sectionLoader}>
            <QuipLoader pool={THINKING_QUIPS} showArchie={false} size={0} />
          </View>
        )}
        {header?.categories.map((cat, index) => {
          const catFraction =
            cat.topicsTotal > 0 ? cat.topicsCompleted / cat.topicsTotal : 0;
          return (
            <Animated.View
              key={cat.slug}
              entering={FadeInUp.delay(Math.min(index, 10) * 40).duration(300)}
            >
              <Pressable
                onPress={() =>
                  navigation.navigate('CategoryTopics', {
                    category: cat.slug,
                    name: cat.name,
                    hex,
                  })
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Card style={styles.categoryRow}>
                  <View style={[styles.iconDisc, { backgroundColor: `${hex}2E` }]}>
                    <AppText style={[styles.categoryIcon, { color: hex }]}>
                      {categoryInitial(cat.name)}
                    </AppText>
                  </View>
                  <View style={styles.categoryBody}>
                    <View style={styles.categoryNameRow}>
                      <AppText style={styles.categoryName} numberOfLines={1}>
                        {cat.name}
                      </AppText>
                      {isPrimaryView &&
                        dose.isFresh &&
                        !dose.doseCompleted &&
                        dose.todayCategory === cat.slug && (
                          <View
                            style={[styles.todayBadge, { backgroundColor: `${hex}2E` }]}
                          >
                            <MonoText
                              weight="bold"
                              color={hex}
                              style={styles.todayBadgeText}
                            >
                              {copy.todayKicker}
                            </MonoText>
                          </View>
                        )}
                    </View>
                    <MonoText
                      weight="medium"
                      color={theme.textDim}
                      style={styles.categoryMeta}
                    >
                      {strings.home.topicsProgress(cat.topicsCompleted, cat.topicsTotal)}
                    </MonoText>
                    <ProgressBar fraction={catFraction} color={hex} height={4} />
                  </View>
                  <ChevronRightIcon size={16} color={theme.textDim} />
                </Card>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 12, paddingBottom: 28 },
  emptyContent: { padding: 20, gap: 14, paddingBottom: 28 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  chipRow: { flexDirection: 'row', gap: 8 },
  kicker: { fontSize: 10.5, letterSpacing: 1.5 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.24 },
  progressCard: { padding: 14, gap: 9 },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: { fontSize: 11.5 },
  percent: { fontSize: 13 },
  sectionKicker: { fontSize: 10.5, letterSpacing: 1.5, marginTop: 6 },
  sectionLoader: { paddingVertical: 18 },
  categoryRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 17, fontWeight: '800' },
  categoryBody: { flex: 1, minWidth: 0, gap: 6 },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  categoryName: { flexShrink: 1, minWidth: 0, fontSize: 14.5, fontWeight: '600' },
  categoryMeta: { fontSize: 10.5 },
  todayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  todayBadgeText: { fontSize: 8.5, letterSpacing: 1 },
  todayCard: { padding: 16, gap: 8 },
  todayKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  todayTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22 },
  todayDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  todayDoneText: { fontSize: 12.5, lineHeight: 18 },
  emptyCard: { padding: 18, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 13, lineHeight: 19.5 },
});
