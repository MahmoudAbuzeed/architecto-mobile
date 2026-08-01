import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, MonoText, Screen } from '@/components/Primitives';
import { JourneyPath } from '@/components/journey/JourneyPath';
import type { JourneyNodeState } from '@/components/journey/journeyLayout';
import { QuipLoader } from '@/components/QuipLoader';
import { ChevronLeftIcon } from '@/components/icons';
import { useTopicsStore } from '@/store/topics.store';
import { useDailyStore } from '@/store/daily.store';
import { useDailyDose } from '@/hooks/useDailyDose';
import { useSettingsStore } from '@/store/settings.store';
import { useAuthStore, selectIsPro } from '@/store/auth.store';
import { showDialog } from '@/store/ui.store';
import { presentPaywall } from '@/lib/paywall';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { journeyCopyFor } from '@/i18n/journey-copy';
import { THINKING_QUIPS } from '@/lib/quips';
import { isArabic } from '@/lib/languages';
import type { TopicRow } from '@/types';
import type {
  LearnStackParamList,
  RootStackParamList,
} from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<LearnStackParamList, 'CategoryTopics'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Route = RouteProp<LearnStackParamList, 'CategoryTopics'>;

/**
 * One category as a winding journey path. Today's dose is the glowing node;
 * completed topics trail behind it, upcoming ones ahead. Tapping routes by
 * node state (see handleNode): the free user's one node/day flows through the
 * daily lesson, Pro users can open any unlocked topic, and everything else is
 * a paywall or a prerequisites hint.
 */
export function CategoryTopicsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const rtl = isArabic(contentLanguage);
  const copy = journeyCopyFor(contentLanguage);
  const accent = params.hex ?? theme.accent;

  const topics = useTopicsStore((s) => s.byCategory[params.category]);
  const topicsLoading = useTopicsStore((s) => s.loading[params.category]);
  const fetchTopics = useTopicsStore((s) => s.fetch);
  const fetchDaily = useDailyStore((s) => s.fetch);
  const isPro = useAuthStore((s) => selectIsPro(s));
  const dose = useDailyDose();

  useEffect(() => {
    void fetchTopics(params.category);
  }, [params.category, fetchTopics]);

  // Warm the daily dose so the TODAY node lights up (dedupe-safe: the store
  // skips the network when today's payload is already cached).
  useEffect(() => {
    void fetchDaily();
  }, [fetchDaily]);

  // Today's node only belongs to THIS category when the dose says so.
  const todaySlug =
    dose.todayCategory === params.category ? dose.todaySlug : null;

  // Free user, dose still pending, but it's in another category: point there.
  const showElsewhere =
    !isPro &&
    !dose.doseCompleted &&
    !!dose.todaySlug &&
    !!dose.todayCategory &&
    dose.todayCategory !== params.category;

  const handleNode = (topic: TopicRow, state: JourneyNodeState) => {
    switch (state) {
      case 'today':
        // The dose — daily flow (no topicSlug) so it spends the dose + streak,
        // for BOTH free and Pro.
        navigation.navigate('DailyLesson');
        return;
      case 'todayDone':
        showDialog({
          title: copy.doneTodayTitle,
          message: copy.doneTodayBody(dose.streakCurrent),
          mood: 'confetti',
          buttons: [
            {
              text: copy.reviewToday,
              style: 'default',
              onPress: () => navigation.navigate('DailyLesson'),
            },
            { text: copy.gotIt, style: 'cancel' },
          ],
        });
        return;
      case 'available':
        // Pro on-demand browse.
        navigation.navigate('DailyLesson', { topicSlug: topic.slug });
        return;
      case 'completed':
        // Re-read. Free users get a read-only review (backend allows a
        // completed topic); Pro can retake. `review` hides the quiz CTA.
        navigation.navigate('DailyLesson', {
          topicSlug: topic.slug,
          review: !isPro,
        });
        return;
      case 'proGated':
        presentPaywall('topic');
        return;
      case 'locked': {
        const prereqs = topic.missingPrerequisites
          ?.map((p) => p.title)
          .filter(Boolean)
          .join(', ');
        showDialog({
          title: copy.lockedTitle,
          message: prereqs ? strings.learn.needsPrereqs(prereqs) : undefined,
          buttons: [{ text: copy.gotIt, style: 'cancel' }],
        });
        return;
      }
    }
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={theme.textSecondary} />
        </Pressable>
        <AppText style={styles.title} numberOfLines={1}>
          {params.name}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {showElsewhere && (
        <Pressable
          onPress={() =>
            navigation.replace('CategoryTopics', {
              category: dose.todayCategory!,
              name: dose.todayCategoryName ?? '',
              hex: params.hex,
            })
          }
          style={({ pressed }) => [styles.banner, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MonoText weight="semiBold" color={accent} style={styles.bannerText}>
            {copy.todayElsewhere(dose.todayCategoryName ?? '')}
          </MonoText>
        </Pressable>
      )}

      {!topics && topicsLoading ? (
        <View style={styles.sectionLoader}>
          <QuipLoader pool={THINKING_QUIPS} showArchie={false} size={0} />
        </View>
      ) : !topics || topics.length === 0 ? (
        <AppText dim style={styles.emptyText}>
          {strings.learn.noTopics}
        </AppText>
      ) : (
        <JourneyPath
          topics={topics}
          todaySlug={todaySlug}
          doseCompleted={dose.doseCompleted}
          isPro={isPro}
          accent={accent}
          rtl={rtl}
          onNodePress={handleNode}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSpacer: { width: 20 },
  banner: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 8,
  },
  bannerText: { fontSize: 11.5, letterSpacing: 0.5 },
  sectionLoader: { paddingVertical: 16, paddingHorizontal: 20 },
  emptyText: { fontSize: 12.5, lineHeight: 18, paddingHorizontal: 20 },
});
