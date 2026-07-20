import React, { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AppText, Card, Chip, MonoText, Screen } from '@/components/Primitives';
import { QuipLoader } from '@/components/QuipLoader';
import { ChevronRightIcon, CircleCheckIcon, MicIcon } from '@/components/icons';
import { useDrillsStore } from '@/store/drills.store';
import { useSettingsStore } from '@/store/settings.store';
import { useTheme } from '@/theme/useTheme';
import { CATEGORY_GROUP_COLORS, DIFFICULTY_COLORS } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { formatEstimate } from '@/lib/format';
import type { DrillRow, RepCategoryGroup } from '@/types';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
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

export function DrillsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const payload = useDrillsStore((s) => s.payload);
  const group = useDrillsStore((s) => s.group);
  const setGroup = useDrillsStore((s) => s.setGroup);
  const fetch = useDrillsStore((s) => s.fetch);
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const setContentLanguage = useSettingsStore((s) => s.setContentLanguage);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  const renderRow = useCallback(
    ({ item, index }: { item: DrillRow; index: number }) => (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 10) * 40).duration(300)}>
        <Pressable
          onPress={() =>
            navigation.navigate('RepSession', {
              drillSlug: item.questionSlug,
              title: item.title,
              prompt: item.title,
              estimatedSeconds: item.estimatedMinutes * 60,
            })
          }
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Card style={styles.row}>
            <View style={styles.rowBody}>
              <AppText style={styles.rowTitle}>{item.title}</AppText>
              <View style={styles.metaRow}>
                <MonoText
                  weight="semiBold"
                  color={DIFFICULTY_COLORS[item.difficulty]}
                  style={styles.diff}
                >
                  {item.difficulty.toUpperCase()}
                </MonoText>
                <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
                  {formatEstimate(item.estimatedMinutes)}
                </MonoText>
                <View style={styles.voiceBadge}>
                  <MicIcon size={9} color={theme.textDim} strokeWidth={2.6} />
                  <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
                    {strings.drills.voice}
                  </MonoText>
                </View>
              </View>
            </View>
            {item.done ? (
              <CircleCheckIcon size={18} color={theme.emerald} />
            ) : (
              <ChevronRightIcon size={16} color={theme.textDim} />
            )}
          </Card>
        </Pressable>
      </Animated.View>
    ),
    [navigation, theme],
  );

  return (
    <Screen>
      {/* Title + EN/ع content-language toggle */}
      <View style={styles.headerRow}>
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
      {!payload ? (
        <View style={styles.loading}>
          <QuipLoader pool={THINKING_QUIPS} size={160} />
        </View>
      ) : (
        <FlatList
          data={payload.questions}
          keyExtractor={(item) => item.questionSlug}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.footer}>
              {payload.freeDrillsRemainingToday !== null && (
                <AppText dim style={styles.footerText}>
                  {strings.drills.freeLeft(payload.freeDrillsRemainingToday)}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.24 },
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
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 5 },
  rowTitle: { fontSize: 14.5, fontWeight: '600', lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diff: { fontSize: 10, letterSpacing: 0.6 },
  meta: { fontSize: 10.5 },
  voiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footer: { paddingTop: 6, paddingHorizontal: 20, gap: 4 },
  footerText: { fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
});
