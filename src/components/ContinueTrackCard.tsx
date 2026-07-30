import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Card, MonoText, PrimaryButton } from './Primitives';
import { ProgressBar } from './ProgressBar';
import { ChevronRightIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { titleCaseSlug } from '@/lib/format';
import type { ContinueTrack } from '@/types';
import type {
  RootStackParamList,
  TabParamList,
} from '@/app/navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * Home's "continue your track" card (between Today's Rep and the XP bar).
 * Field absent (old backend) → renders nothing, so the two deploys stay
 * independent. null → pick-track CTA; complete → switch CTA; otherwise the
 * current topic + next-drill continue button.
 */
export function ContinueTrackCard({
  data,
}: {
  data: ContinueTrack | null | undefined;
}) {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  // Old backend: the key never arrives — render nothing.
  if (data === undefined) return null;

  // No track picked yet.
  if (data === null) {
    return (
      <Card style={styles.card}>
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={styles.kicker}
        >
          {strings.home.yourTrack}
        </MonoText>
        <AppText style={styles.title}>{strings.home.pickTrackTitle}</AppText>
        <AppText secondary style={styles.body}>
          {strings.home.pickTrackBody}
        </AppText>
        <PrimaryButton
          height={44}
          label={strings.home.pickTrackCta}
          onPress={() =>
            navigation.navigate('TrackPicker', { context: 'first-pick' })
          }
        />
      </Card>
    );
  }

  const complete = data.topicsTotal > 0 && data.topicsCompleted >= data.topicsTotal;
  const fraction = data.topicsTotal > 0 ? data.topicsCompleted / data.topicsTotal : 0;

  // Track finished → nudge toward the next one.
  if (complete) {
    return (
      <Card style={styles.card}>
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={styles.kicker}
        >
          {`${strings.home.yourTrack} · ${data.label.toUpperCase()}`}
        </MonoText>
        <AppText secondary style={styles.body}>
          {strings.home.trackCompleteBody}
        </AppText>
        <PrimaryButton
          height={44}
          label={strings.home.switchTrackCta}
          onPress={() => navigation.navigate('TrackPicker', { context: 'switch' })}
        />
      </Card>
    );
  }

  const onContinue = () => {
    if (data.nextDrill) {
      navigation.navigate('RepSession', {
        drillSlug: data.nextDrill.questionSlug,
        title: data.nextDrill.title,
        prompt: data.nextDrill.prompt,
        category: data.nextDrill.category,
      });
      return;
    }
    // No drill queued — land on the track's current category (or the track).
    if (data.currentTopic) {
      navigation.navigate('Learn', {
        screen: 'CategoryTopics',
        params: {
          category: data.currentTopic.category,
          name: titleCaseSlug(data.currentTopic.category),
        },
      });
    } else {
      navigation.navigate('Learn', { screen: 'TrackOverview' });
    }
  };

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => navigation.navigate('Learn', { screen: 'TrackOverview' })}
        style={({ pressed }) => [styles.headerRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <MonoText
          weight="semiBold"
          color={theme.textSecondary}
          style={styles.kicker}
        >
          {`${strings.home.yourTrack} · ${data.label.toUpperCase()}`}
        </MonoText>
        <ChevronRightIcon size={13} color={theme.textDim} />
      </Pressable>
      {data.currentTopic && (
        <AppText style={styles.title}>{data.currentTopic.title}</AppText>
      )}
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <ProgressBar fraction={fraction} color={data.hex} height={6} />
        </View>
        <MonoText weight="medium" color={theme.textSecondary} style={styles.progressText}>
          {strings.home.topicsProgress(data.topicsCompleted, data.topicsTotal)}
        </MonoText>
      </View>
      <PrimaryButton
        height={44}
        label={strings.home.continueCta}
        onPress={onContinue}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 10.5, letterSpacing: 1.5 },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  body: { fontSize: 12.5, lineHeight: 18.5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, minWidth: 0 },
  progressText: { fontSize: 11 },
});
