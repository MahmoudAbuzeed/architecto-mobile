import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { AppText, PrimaryButton, Screen } from '@/components/Primitives';
import { QuipLoader } from '@/components/QuipLoader';
import { LegalConsent } from '@/components/LegalConsent';
import { AuroraBackground } from '@/components/AuroraBackground';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { OtpInput } from '@/components/OtpInput';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/useTheme';
import { mono } from '@/theme/typography';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/app/navigation/types';

type EmailAuthRoute = RouteProp<RootStackParamList, 'EmailAuth'>;

// Siblings glide when the Name field mounts/unmounts on mode switch.
const FIELD_LAYOUT = LinearTransition.springify().damping(18).stiffness(180);

export function EmailAuthScreen() {
  const theme = useTheme();
  const route = useRoute<EmailAuthRoute>();

  const [mode, setMode] = useState<'login' | 'register'>(route.params.mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const pendingVerificationEmail = useAuthStore(
    (s) => s.pendingVerificationEmail,
  );

  const isRegister = mode === 'register';
  const formIncomplete =
    !email.trim() || !password || (isRegister && !name.trim());
  const hasError = error != null;

  // A short error haptic when the store surfaces a new error.
  const prevError = useRef<string | null>(null);
  useEffect(() => {
    if (error && !prevError.current) haptic('notificationError');
    prevError.current = error;
  }, [error]);

  const submit = async () => {
    try {
      if (isRegister) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch {
      // Store carries the error; RootNavigator handles success.
    }
  };

  const submitOtp = async () => {
    try {
      await verifyOtp(otp);
    } catch {
      // Store carries the error.
    }
  };

  // OTP verification state — shown once register/login reports the account
  // needs email verification.
  if (pendingVerificationEmail) {
    return (
      <Screen edges={['top', 'bottom']}>
        <AuroraBackground intensity="calm" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <Animated.View entering={FadeInUp.duration(350)} style={styles.header}>
              <AppText style={styles.title}>{strings.auth.otpTitle}</AppText>
              <AppText secondary style={styles.subtitle}>
                {strings.auth.otpSubtitle} {pendingVerificationEmail}
              </AppText>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(80).duration(350)}
              style={styles.form}
            >
              <OtpInput value={otp} onChange={setOtp} />
              {hasError ? (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <AppText style={[styles.error, { color: theme.red }]}>
                    {error}
                  </AppText>
                </Animated.View>
              ) : null}
              <PrimaryButton
                label={strings.auth.otpVerify}
                disabled={isLoading || otp.length < 6}
                onPress={() => void submitOtp()}
              />
            </Animated.View>

            {isLoading && (
              <Animated.View
                entering={FadeInUp.duration(350)}
                style={styles.loaderBox}
              >
                <QuipLoader pool={THINKING_QUIPS} size={80} showArchie={false} />
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <AuroraBackground intensity="calm" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Animated.View style={styles.header} layout={FIELD_LAYOUT}>
            <Animated.View
              key={mode}
              entering={FadeInDown.duration(220)}
              exiting={FadeOut.duration(150)}
            >
              <AppText style={styles.title}>
                {isRegister
                  ? strings.auth.registerTitle
                  : strings.auth.loginTitle}
              </AppText>
              <AppText secondary style={styles.subtitle}>
                {isRegister
                  ? strings.auth.registerSubtitle
                  : strings.auth.loginSubtitle}
              </AppText>
            </Animated.View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(80).duration(350)}
            style={styles.form}
          >
            {isRegister && (
              <Animated.View
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(180)}
                layout={FIELD_LAYOUT}
              >
                <ThemedTextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={strings.auth.name}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={hasError}
                />
              </Animated.View>
            )}
            <Animated.View layout={FIELD_LAYOUT}>
              <ThemedTextInput
                value={email}
                onChangeText={setEmail}
                placeholder={strings.auth.email}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={hasError}
              />
            </Animated.View>
            <Animated.View layout={FIELD_LAYOUT}>
              <ThemedTextInput
                value={password}
                onChangeText={setPassword}
                placeholder={strings.auth.password}
                autoCapitalize="none"
                secureTextEntry
                error={hasError}
              />
            </Animated.View>

            {hasError ? (
              <Animated.View entering={FadeInDown.duration(200)} layout={FIELD_LAYOUT}>
                <AppText style={[styles.error, { color: theme.red }]}>
                  {error}
                </AppText>
              </Animated.View>
            ) : null}

            <Animated.View layout={FIELD_LAYOUT}>
              <PrimaryButton
                label={isRegister ? strings.auth.register : strings.auth.login}
                disabled={isLoading || formIncomplete}
                onPress={() => void submit()}
              />
            </Animated.View>

            <Animated.View layout={FIELD_LAYOUT}>
              <Pressable
                onPress={() => {
                  clearError();
                  setMode(isRegister ? 'login' : 'register');
                }}
                style={({ pressed }) => [
                  styles.switchMode,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <AppText secondary style={styles.switchModeText}>
                  {isRegister
                    ? strings.auth.switchToLogin
                    : strings.auth.switchToRegister}
                </AppText>
              </Pressable>
            </Animated.View>

            <Animated.View layout={FIELD_LAYOUT}>
              <LegalConsent />
            </Animated.View>
          </Animated.View>

          {isLoading && (
            <Animated.View
              entering={FadeInUp.duration(350)}
              style={styles.loaderBox}
            >
              <QuipLoader pool={THINKING_QUIPS} size={80} showArchie={false} />
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 28,
    gap: 22,
  },
  header: { gap: 8 },
  title: {
    fontFamily: mono.semiBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  form: { gap: 12 },
  error: { fontSize: 12.5, lineHeight: 18 },
  switchMode: { alignSelf: 'center', paddingVertical: 6 },
  switchModeText: { fontSize: 13, fontWeight: '600' },
  loaderBox: { alignItems: 'center', paddingTop: 6 },
});
