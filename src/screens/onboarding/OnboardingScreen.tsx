import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  AppText,
  GhostButton,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { ArchieLottie } from '@/components/ArchieCircle';
import { BoltIcon, FlameOutlineIcon, MicIcon } from '@/components/icons';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';
import { wordmark } from '@/theme/typography';
import { strings } from '@/i18n/strings';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { borderColor: theme.borderStrong }]}>
      {icon}
      <AppText secondary style={styles.chipText}>
        {label}
      </AppText>
    </View>
  );
}

export function OnboardingScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  // Idle bob on the brain — same float as ArchieCircle's asking state.
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(-5, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bob]);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  const onGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch {
      // Store surfaces the error; nothing else to do here.
    }
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.hero}>
        <Animated.View entering={FadeInUp.delay(60)} style={bobStyle}>
          <ArchieLottie mood="brain" size={120} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(140)}>
          <MonoText weight="medium" color={theme.textSecondary} style={wordmark}>
            {strings.onboarding.wordmark}
          </MonoText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(220)}>
          <AppText style={styles.headline}>{strings.onboarding.headline}</AppText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(300)}>
          <AppText secondary style={styles.subtitle}>
            {strings.onboarding.subtitle}
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(380)} style={styles.chipRow}>
          <FeatureChip
            icon={<FlameOutlineIcon size={11} color={theme.accent} />}
            label={strings.onboarding.chipStreaks}
          />
          <FeatureChip
            icon={<BoltIcon size={11} color={theme.xp} />}
            label={strings.onboarding.chipXp}
          />
          <FeatureChip
            icon={<MicIcon size={11} color={theme.blue} strokeWidth={2.4} />}
            label={strings.onboarding.chipVoice}
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(460)} style={styles.footer}>
        {error != null && (
          <AppText style={[styles.error, { color: theme.red }]}>{error}</AppText>
        )}
        <PrimaryButton
          label={strings.onboarding.google}
          onPress={() => void onGoogle()}
          disabled={isLoading}
        />
        <GhostButton
          label={strings.onboarding.email}
          onPress={() => navigation.navigate('EmailAuth', { mode: 'register' })}
        />
        <AppText dim style={styles.proNote}>
          {strings.onboarding.proNote}
        </AppText>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 28, paddingBottom: 12 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 22.5,
    textAlign: 'center',
    maxWidth: 300,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  chipText: { fontSize: 11.5, fontWeight: '500' },
  footer: { gap: 10 },
  error: { fontSize: 12.5, lineHeight: 17, textAlign: 'center' },
  proNote: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
  },
});
