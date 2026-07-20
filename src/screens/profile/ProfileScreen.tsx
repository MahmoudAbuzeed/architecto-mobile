import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  AppText,
  Card,
  Chip,
  GhostButton,
  MonoText,
  Screen,
} from '@/components/Primitives';
import { useTheme } from '@/theme/useTheme';
import { useThemeStore, ThemeMode } from '@/theme/theme.store';
import { radius } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import { initials } from '@/lib/format';
import { ARABIC_DIALECTS } from '@/lib/languages';
import { useAuthStore, selectIsPro } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { WEB_PRICING_URL } from '@/services/env';

const THEME_MODES: ReadonlyArray<{ mode: ThemeMode; label: string }> = [
  { mode: 'dark', label: 'Dark' },
  { mode: 'light', label: 'Light' },
  { mode: 'system', label: 'System' },
];

export function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const isPro = useAuthStore((s) => selectIsPro(s));
  const logout = useAuthStore((s) => s.logout);
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const setContentLanguage = useSettingsStore((s) => s.setContentLanguage);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.title}>{strings.profile.title}</AppText>

        {/* Identity */}
        <Animated.View entering={FadeInUp.delay(40)}>
          <Card style={styles.identityCard}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.borderStrong,
                },
              ]}
            >
              <AppText secondary style={styles.avatarText}>
                {initials(user?.name)}
              </AppText>
            </View>
            <View style={styles.identityInfo}>
              <AppText style={styles.name}>{user?.name}</AppText>
              <AppText dim style={styles.email}>
                {user?.email}
              </AppText>
            </View>
            <View
              style={[
                styles.planPill,
                isPro
                  ? { borderColor: '#eab30866' }
                  : { borderColor: theme.borderStrong },
              ]}
            >
              <MonoText
                weight="semiBold"
                color={isPro ? theme.xp : theme.textDim}
                style={styles.planText}
              >
                {isPro ? strings.profile.pro : strings.profile.free}
              </MonoText>
            </View>
          </Card>
        </Animated.View>

        {/* Upgrade nudge */}
        {!isPro && (
          <Animated.View entering={FadeInUp.delay(80)}>
            <Card style={styles.upgradeCard}>
              <AppText secondary style={styles.proNote}>
                {strings.profile.proNote}
              </AppText>
              <GhostButton
                height={44}
                label={strings.profile.upgrade}
                onPress={() => {
                  void Linking.openURL(WEB_PRICING_URL);
                }}
              />
            </Card>
          </Animated.View>
        )}

        {/* Content language */}
        <Animated.View entering={FadeInUp.delay(120)}>
          <Card style={styles.sectionCard}>
            <AppText style={styles.sectionLabel}>
              {strings.profile.contentLanguage}
            </AppText>
            <AppText dim style={styles.sectionDescription}>
              English or Arabic — questions, grading and Archie's voice.
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Chip
                label="EN"
                active={contentLanguage === 'en'}
                onPress={() => setContentLanguage('en')}
              />
              {ARABIC_DIALECTS.map((dialect) => (
                <Chip
                  key={dialect.code}
                  label={dialect.nativeName}
                  active={contentLanguage === dialect.code}
                  onPress={() => setContentLanguage(dialect.code)}
                />
              ))}
            </ScrollView>
          </Card>
        </Animated.View>

        {/* Theme */}
        <Animated.View entering={FadeInUp.delay(160)}>
          <Card style={styles.sectionCard}>
            <AppText style={styles.sectionLabel}>
              {strings.profile.theme}
            </AppText>
            <View style={styles.chipRow}>
              {THEME_MODES.map(({ mode, label }) => (
                <Chip
                  key={mode}
                  label={label}
                  active={themeMode === mode}
                  onPress={() => setThemeMode(mode)}
                />
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.signOut,
              {
                borderColor: theme.borderStrong,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText style={[styles.signOutText, { color: theme.red }]}>
              {strings.profile.signOut}
            </AppText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  identityCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '600' },
  identityInfo: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 12 },
  planPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planText: { fontSize: 10, letterSpacing: 1.5 },
  upgradeCard: { padding: 16, gap: 12 },
  proNote: { fontSize: 12.5, lineHeight: 18 },
  sectionCard: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  sectionDescription: { fontSize: 11.5, lineHeight: 16 },
  chipRow: { flexDirection: 'row', gap: 8 },
  signOut: {
    borderWidth: 1,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '600' },
});
