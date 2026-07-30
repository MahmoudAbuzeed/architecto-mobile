import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  CompositeNavigationProp,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, MonoText, PrimaryButton, Screen } from '@/components/Primitives';
import { TopicRow } from '@/components/TopicRow';
import { DrillRowCard } from '@/components/DrillRowCard';
import { QuipLoader } from '@/components/QuipLoader';
import { ChevronLeftIcon } from '@/components/icons';
import { useTopicsStore } from '@/store/topics.store';
import { useSettingsStore } from '@/store/settings.store';
import { repService } from '@/services/rep.service';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { isArabic } from '@/lib/languages';
import type { DrillRow, DrillsPayload } from '@/types';
import type {
  LearnStackParamList,
  RootStackParamList,
} from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<LearnStackParamList, 'CategoryTopics'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Route = RouteProp<LearnStackParamList, 'CategoryTopics'>;

const DRILLS_PAGE_LIMIT = 30;

function payloadHasMore(payload: DrillsPayload): boolean {
  return payload.hasMore ?? payload.page * payload.limit < payload.total;
}

/**
 * One category: its topics (status glyphs from `/learn/topics`, the web's
 * source of truth) followed by its drills (paginated, category-scoped), with
 * a sticky "Start next drill" CTA on the first drill you haven't done.
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

  // Category-scoped drill pagination is local to this screen — the shared
  // drills.store keeps the all-drills catalog state (group filter et al).
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const [drillsLoading, setDrillsLoading] = useState(true);

  const loadDrills = useCallback(
    async (page: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setDrillsLoading(true);
      try {
        const payload = await repService.getDrills({
          category: params.category,
          page,
          limit: DRILLS_PAGE_LIMIT,
        });
        pageRef.current = payload.page ?? page;
        setDrills((prev) =>
          page === 1 ? payload.questions : [...prev, ...payload.questions],
        );
        setHasMore(payloadHasMore(payload));
      } catch {
        // Old backend without the category filter: the topics list above
        // still stands on its own; the drills section just stays empty.
        if (page === 1) setDrills([]);
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setDrillsLoading(false);
      }
    },
    [params.category],
  );

  useEffect(() => {
    void fetchTopics(params.category);
    void loadDrills(1);
  }, [params.category, fetchTopics, loadDrills]);

  const startDrill = useCallback(
    (drill: DrillRow) => {
      navigation.navigate('RepSession', {
        drillSlug: drill.questionSlug,
        title: drill.title,
        prompt: drill.title,
        category: params.category,
      });
    },
    [navigation, params.category],
  );

  const nextDrill = drills.find((d) => !d.done) ?? null;

  const listHeader = (
    <View style={styles.listHeader}>
      {/* Topics */}
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
            <TopicRow key={topic.slug} topic={topic} rtl={rtl} />
          ))}
        </View>
      )}

      {/* Drills */}
      {drills.length > 0 && (
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={[styles.sectionKicker, styles.drillsKicker]}
        >
          {strings.learn.drills}
        </MonoText>
      )}
    </View>
  );

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

      <FlatList
        data={drills}
        keyExtractor={(item) => item.questionSlug}
        renderItem={({ item, index }) => (
          <DrillRowCard drill={item} index={index} onPress={() => startDrill(item)} />
        )}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore) void loadDrills(pageRef.current + 1);
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          drillsLoading && drills.length > 0 ? (
            <View style={styles.footerLoader}>
              <QuipLoader pool={THINKING_QUIPS} showArchie={false} size={0} />
            </View>
          ) : null
        }
      />

      {/* Sticky next-drill CTA */}
      {nextDrill && (
        <View style={[styles.ctaBar, { borderTopColor: theme.border }]}>
          <PrimaryButton
            height={48}
            label={strings.learn.startNextDrill}
            onPress={() => startDrill(nextDrill)}
          />
        </View>
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
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 10 },
  listHeader: { gap: 10 },
  sectionKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  drillsKicker: { marginTop: 14 },
  sectionLoader: { paddingVertical: 16 },
  emptyText: { fontSize: 12.5, lineHeight: 18 },
  footerLoader: { paddingVertical: 14 },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
