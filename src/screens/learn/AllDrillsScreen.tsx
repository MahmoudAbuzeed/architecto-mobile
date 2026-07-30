import React, { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  CompositeNavigationProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Chip, Screen } from '@/components/Primitives';
import { DrillRowCard } from '@/components/DrillRowCard';
import { QuipLoader } from '@/components/QuipLoader';
import { ChevronLeftIcon } from '@/components/icons';
import { useDrillsStore } from '@/store/drills.store';
import { useSettingsStore } from '@/store/settings.store';
import { useTheme } from '@/theme/useTheme';
import { CATEGORY_GROUP_COLORS } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import type { DrillRow, RepCategoryGroup } from '@/types';
import type {
  LearnStackParamList,
  RootStackParamList,
} from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<LearnStackParamList, 'AllDrills'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Group = 'all' | RepCategoryGroup;

const GROUPS: Array<{ key: Group; label: string; color?: string }> = [
  { key: 'all', label: strings.drills.all },
  {
    key: 'engineering',
    label: strings.drills.engineering,
    color: CATEGORY_GROUP_COLORS.engineering,
  },
  {
    key: 'management',
    label: strings.drills.management,
    color: CATEGORY_GROUP_COLORS.management,
  },
  {
    key: 'product',
    label: strings.drills.product,
    color: CATEGORY_GROUP_COLORS.product,
  },
];

/** The full drill catalog (ex-Drills tab): group chips + infinite scroll. */
export function AllDrillsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const rows = useDrillsStore((s) => s.rows);
  const hasMore = useDrillsStore((s) => s.hasMore);
  const isLoading = useDrillsStore((s) => s.isLoading);
  const freeDrillsRemainingToday = useDrillsStore((s) => s.freeDrillsRemainingToday);
  const group = useDrillsStore((s) => s.group);
  const setGroup = useDrillsStore((s) => s.setGroup);
  const fetch = useDrillsStore((s) => s.fetch);
  const loadMore = useDrillsStore((s) => s.loadMore);
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const setContentLanguage = useSettingsStore((s) => s.setContentLanguage);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  const renderRow = useCallback(
    ({ item, index }: { item: DrillRow; index: number }) => (
      <DrillRowCard
        drill={item}
        index={index}
        onPress={() =>
          navigation.navigate('RepSession', {
            drillSlug: item.questionSlug,
            title: item.title,
            prompt: item.title,
            category: item.category,
          })
        }
      />
    ),
    [navigation],
  );

  return (
    <Screen>
      {/* Title + EN/ع content-language toggle */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={theme.textSecondary} />
        </Pressable>
        <AppText style={styles.title}>{strings.drills.title}</AppText>
        <View
          style={[
            styles.toggle,
            { backgroundColor: theme.card, borderColor: theme.borderStrong },
          ]}
        >
          <Pressable
            onPress={() => setContentLanguage('en')}
            style={[
              styles.segment,
              contentLanguage === 'en' && { backgroundColor: theme.action },
            ]}
          >
            <AppText
              style={[
                styles.segmentText,
                {
                  color:
                    contentLanguage === 'en' ? theme.actionText : theme.textSecondary,
                },
              ]}
            >
              EN
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setContentLanguage('ar-eg')}
            style={[
              styles.segment,
              contentLanguage !== 'en' && { backgroundColor: theme.action },
            ]}
          >
            <AppText
              style={[
                styles.segmentText,
                styles.segmentTextAr,
                {
                  color:
                    contentLanguage !== 'en' ? theme.actionText : theme.textSecondary,
                },
              ]}
            >
              ع
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Category filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {GROUPS.map((g) => (
            <Chip
              key={g.key}
              label={g.label}
              active={group === g.key}
              activeColor={g.color}
              onPress={() => setGroup(g.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Drill list */}
      {rows.length === 0 && isLoading ? (
        <View style={styles.loading}>
          <QuipLoader pool={THINKING_QUIPS} size={160} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.questionSlug}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasMore) void loadMore();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            <View style={styles.footer}>
              {isLoading && rows.length > 0 && (
                <View style={styles.footerLoader}>
                  <QuipLoader pool={THINKING_QUIPS} showArchie={false} size={0} />
                </View>
              )}
              {freeDrillsRemainingToday !== null && (
                <AppText dim style={styles.footerText}>
                  {strings.drills.freeLeft(freeDrillsRemainingToday)}
                </AppText>
              )}
              <AppText dim style={styles.footerText}>
                {strings.drills.footer}
              </AppText>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: { flex: 1, minWidth: 0, fontSize: 24, fontWeight: '700', letterSpacing: -0.24 },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 12, fontWeight: '600' },
  segmentTextAr: { fontSize: 13, lineHeight: 15 },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, gap: 10 },
  footer: { paddingTop: 6, paddingHorizontal: 20, gap: 4 },
  footerLoader: { paddingVertical: 10 },
  footerText: { fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
});
