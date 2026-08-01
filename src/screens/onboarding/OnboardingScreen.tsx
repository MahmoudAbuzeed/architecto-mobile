import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
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
import { AuroraBackground } from '@/components/AuroraBackground';
import { GlowHalo } from '@/components/GlowHalo';
import {
  BoltIcon,
  FlameOutlineIcon,
  GoogleIcon,
  MailIcon,
  MicIcon,
} from '@/components/icons';
import { LegalConsent } from '@/components/LegalConsent';
import { AppleSignInButton } from '@/components/AppleSignInButton';
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
  const loginWithApple = useAuthStore((s) => s.loginWithApple);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const reduced = useReducedMotion();

  // Idle bob on the brain — same float as ArchieCircle's asking state. Gated on
  // reduced motion (withRepeat would otherwise freeze at the -5px end value).
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(
      withTiming(-5, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bob, reduced]);
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

  const onApple = async () => {
    try {
      await loginWithApple();
    } catch {
      // Store surfaces the error; nothing else to do here.
    }
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.root}>
      <AuroraBackground intensity="full" />
      <View style={styles.topSpacer} />
      <View style={styles.hero}>
        <Animated.View
          entering={FadeInUp.delay(60).springify().damping(18).stiffness(160)}
          style={[styles.archieWrap, bobStyle]}
        >
          <GlowHalo size={200} />
          <ArchieLottie mood="brain" size={120} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(140).duration(400)}>
          <MonoText weight="medium" color={theme.textSecondary} style={wordmark}>
            {strings.onboarding.wordmark}
          </MonoText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(220).duration(400)}>
          <AppText style={styles.headline}>{strings.onboarding.headline}</AppText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <AppText secondary style={styles.subtitle}>
            {strings.onboarding.subtitle}
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(380).duration(400)} style={styles.chipRow}>
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

      <View style={styles.midSpacer} />

      <Animated.View entering={FadeInUp.delay(460).duration(400)} style={styles.footer}>
        {error != null && (
          <AppText style={[styles.error, { color: theme.red }]}>{error}</AppText>
        )}
        <AppleSignInButton onPress={() => void onApple()} />
        <PrimaryButton
          label={strings.onboarding.google}
          icon={<GoogleIcon size={18} />}
          onPress={() => void onGoogle()}
          disabled={isLoading}
        />
        <GhostButton
          label={strings.onboarding.email}
          icon={<MailIcon size={17} color={theme.text} strokeWidth={2} />}
          onPress={() => navigation.navigate('EmailAuth', { mode: 'register' })}
        />
        <LegalConsent />
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 28, paddingBottom: 12 },
  // Free vertical space is split across three spacers instead of pooling into
  // two big voids (above the logo + before the CTA). Weights keep the hero a
  // touch above center and lift the buttons slightly off the bottom edge.
  topSpacer: { flex: 0.9 },
  midSpacer: { flex: 1 },
  bottomSpacer: { flex: 0.5 },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  archieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    // System bold sans — matches the app's other titles (lesson, Home), not
    // the mono wordmark above it.
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.6,
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
});
