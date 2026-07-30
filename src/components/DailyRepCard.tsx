import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Card, MonoText, PrimaryButton } from './Primitives';
import { PlayIcon } from './icons';
import { useHomeStore } from '@/store/home.store';
import { ELEVATED_FG } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * The daily voice-rep card — sibling to TodayLessonCard in the "TODAY"
 * carousel. Flex-fills its fixed-height carousel slot with the CTA pinned to
 * the bottom, so it lines up with the lesson card as you swipe between them.
 */
export function DailyRepCard() {
  const navigation = useNavigation<Nav>();
  const home = useHomeStore((s) => s.home);
  if (!home) return null;

  const { dailyRep, streak, level } = home;
  const completed = dailyRep.status === 'completed';

  const onPress = () => {
    if (completed && dailyRep.attempt) {
      navigation.navigate('Feedback', {
        result: {
          ...dailyRep.attempt,
          streak: {
            current: streak.current,
            longest: streak.current,
            isNewRecord: false,
            extendedToday: streak.activeToday,
            freezeApplied: false,
          },
          levelProgress: level,
          celebrate: false,
        },
      });
    } else {
      navigation.navigate('RepSession', {
        drillSlug: null,
        title: dailyRep.title,
        prompt: dailyRep.prompt,
        category: dailyRep.category,
      });
    }
  };

  return (
    <Card elevated style={styles.card}>
      <View style={styles.headerRow}>
        <MonoText weight="semiBold" color={ELEVATED_FG.dim} style={styles.kicker}>
          {strings.home.repDemotedKicker}
        </MonoText>
        <MonoText weight="medium" color={ELEVATED_FG.dim} style={styles.meta}>
          {strings.home.repMeta}
        </MonoText>
      </View>
      <AppText numberOfLines={2} style={styles.title}>
        {dailyRep.title}
      </AppText>
      <AppText secondary numberOfLines={2} style={styles.body}>
        {completed
          ? dailyRep.attempt?.verdict ?? strings.home.completedTitle
          : strings.home.repPitch}
      </AppText>
      <View style={styles.spacer} />
      <PrimaryButton
        height={48}
        inverted
        icon={completed ? undefined : <PlayIcon size={14} color="#171717" />}
        label={completed ? strings.home.completedCta : strings.home.start}
        onPress={onPress}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kicker: { fontSize: 10.5, letterSpacing: 1.5, flexShrink: 1, minWidth: 0 },
  meta: { fontSize: 11, flexShrink: 0, marginLeft: 10 },
  title: { fontSize: 19, fontWeight: '700', lineHeight: 24, color: ELEVATED_FG.text },
  body: { fontSize: 13, lineHeight: 19.5, color: ELEVATED_FG.secondary, marginTop: 8 },
  spacer: { flex: 1, minHeight: 12 },
});
