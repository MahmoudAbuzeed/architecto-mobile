import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  AppText,
  Card,
  GhostButton,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { StreakFlame } from '@/components/StreakFlame';
import { BoltIcon } from '@/components/icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Celebration'>;

const SUPPORT_LINE =
  'Statistically, you now explain consistent hashing in your sleep.';

export function CelebrationScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { streak, isNewRecord, xpToday } = params;

  const share = () => {
    Share.share({ message: strings.celebration.shareText(streak) }).catch(
      () => {
        // User dismissed the share sheet — nothing to do.
      },
    );
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.root}>
      {/* Confetti rains over everything but never blocks touches. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LottieView
          source={require('@/assets/lottie/confetti.json')}
          autoPlay
          loop={false}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.center}>
        <Animated.View entering={FadeInUp.delay(0)}>
          <StreakFlame size={130} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80)}>
          <MonoText weight="bold" color={theme.accent} style={styles.streakNumber}>
            {streak}
          </MonoText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160)}>
          <AppText style={styles.title}>
            {isNewRecord
              ? strings.celebration.newRecord
              : strings.celebration.dayStreak(streak)}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(240)}>
          <AppText secondary style={styles.support}>
            {SUPPORT_LINE}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(320)}>
          <Card style={styles.xpChip}>
            <BoltIcon size={13} color={theme.xp} />
            <MonoText weight="bold" color={theme.xp} style={styles.xpText}>
              {strings.celebration.xpToday(xpToday)}
            </MonoText>
          </Card>
        </Animated.View>
      </View>

      {/* Plain View: buttons inside animating subtrees can miss taps on
          Fabric (RN #51621). */}
      <View style={styles.footer}>
        <PrimaryButton
          label={strings.celebration.tomorrow}
          onPress={() => navigation.popToTop()}
        />
        <GhostButton
          bordered={false}
          height={44}
          label={strings.celebration.share}
          onPress={share}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  streakNumber: {
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  support: {
    fontSize: 13.5,
    lineHeight: 21,
    maxWidth: 280,
    textAlign: 'center',
  },
  xpChip: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  xpText: { fontSize: 14 },
  footer: { gap: 10 },
});
