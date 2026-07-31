import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, MonoText, Screen } from '@/components/Primitives';
import { TopicRow } from '@/components/TopicRow';
import { QuipLoader } from '@/components/QuipLoader';
import { ChevronLeftIcon } from '@/components/icons';
import { useTopicsStore } from '@/store/topics.store';
import { useSettingsStore } from '@/store/settings.store';
import { useAuthStore, selectIsPro } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { isArabic } from '@/lib/languages';
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
 * One category: its topics with status glyphs (from `/learn/topics`, the web's
 * source of truth). Tapping an unlocked topic opens ITS lesson + MCQ (off the
 * daily dose) via the shared DailyLesson/DailyQuiz screens; the old per-drill
 * voice sessions were retired.
 */
export function CategoryTopicsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const rtl = isArabic(contentLanguage);

  const topics = useTopicsStore((s) => s.byCategory[params.category]);
  const topicsLoading = useTopicsStore((s) => s.loading[params.category]);
  const fetchTopics = useTopicsStore((s) => s.fetch);
  // The daily dose is everyone's one free lesson/day; browsing any topic on
  // demand ("keep learning") is the unlimited path, so it's Pro-only — free
  // users get the paywall instead of the lesson. The backend enforces the same
  // gate (403 UPGRADE_REQUIRED); this just makes it instant.
  const isPro = useAuthStore((s) => selectIsPro(s));

  useEffect(() => {
    void fetchTopics(params.category);
  }, [params.category, fetchTopics]);

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

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={styles.sectionKicker}
        >
          {strings.learn.topics}
        </MonoText>
        {!topics && topicsLoading ? (
          <View style={styles.sectionLoader}>
            <QuipLoader pool={THINKING_QUIPS} showArchie={false} size={0} />
          </View>
        ) : !topics || topics.length === 0 ? (
          <AppText dim style={styles.emptyText}>
            {strings.learn.noTopics}
          </AppText>
        ) : (
          <View>
            {topics.map((topic) => (
              <TopicRow
                key={topic.slug}
                topic={topic}
                rtl={rtl}
                proGated={topic.status !== 'locked' && !isPro}
                onPress={
                  topic.status === 'locked'
                    ? undefined
                    : () => {
                        if (!isPro) {
                          useUiStore.getState().show({
                            type: 'paywall',
                            message: strings.modals.paywallBody,
                          });
                          return;
                        }
                        navigation.navigate('DailyLesson', {
                          topicSlug: topic.slug,
                        });
                      }
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
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
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 10 },
  sectionKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  sectionLoader: { paddingVertical: 16 },
  emptyText: { fontSize: 12.5, lineHeight: 18 },
});
