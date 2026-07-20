import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AppText, PrimaryButton, Screen } from '@/components/Primitives';
import { QuipLoader } from '@/components/QuipLoader';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';
import { mono } from '@/theme/typography';
import { strings } from '@/i18n/strings';
import { THINKING_QUIPS } from '@/lib/quips';
import type { RootStackParamList } from '@/app/navigation/types';

type EmailAuthRoute = RouteProp<RootStackParamList, 'EmailAuth'>;

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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

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
              <TextInput
                style={[
                  styles.input,
                  styles.otpInput,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={otp}
                onChangeText={setOtp}
                placeholder="······"
                placeholderTextColor={theme.textDim}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {error ? (
                <AppText style={[styles.error, { color: theme.red }]}>
                  {error}
                </AppText>
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Animated.View entering={FadeInUp.duration(350)} style={styles.header}>
            <AppText style={styles.title}>
              {isRegister ? strings.auth.registerTitle : strings.auth.loginTitle}
            </AppText>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(80).duration(350)}
            style={styles.form}
          >
            {isRegister && (
              <TextInput
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder={strings.auth.name}
                placeholderTextColor={theme.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder={strings.auth.email}
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TextInput
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder={strings.auth.password}
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              secureTextEntry
            />

            {error ? (
              <AppText style={[styles.error, { color: theme.red }]}>
                {error}
              </AppText>
            ) : null}

            <PrimaryButton
              label={isRegister ? strings.auth.register : strings.auth.login}
              disabled={isLoading || formIncomplete}
              onPress={() => void submit()}
            />

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
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, lineHeight: 20 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
  },
  otpInput: {
    fontFamily: mono.semiBold,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { fontSize: 12.5, lineHeight: 18 },
  switchMode: { alignSelf: 'center', paddingVertical: 6 },
  switchModeText: { fontSize: 13, fontWeight: '600' },
  loaderBox: { alignItems: 'center', paddingTop: 6 },
});
