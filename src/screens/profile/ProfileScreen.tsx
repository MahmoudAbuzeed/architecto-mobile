import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Card,
  Chip,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { ReminderSettingsCard } from '@/components/ReminderSettingsCard';
import { useTheme } from '@/theme/useTheme';
import { useThemeStore, ThemeMode } from '@/theme/theme.store';
import { radius } from '@/theme/tokens';
import { strings } from '@/i18n/strings';
import { initials } from '@/lib/format';
import { ARABIC_DIALECTS } from '@/lib/languages';
import { useAuthStore, selectIsPro } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { useFeatureFlagsStore, FLAGS } from '@/store/feature-flags.store';
import { showDialog } from '@/store/ui.store';
import { openWebUpgrade } from '@/lib/webCheckout';
import { paywallCopyFor } from '@/i18n/paywall-copy';
import * as purchases from '@/lib/purchases';
import {
  APP_VERSION,
  MANAGE_SUBSCRIPTION_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '@/services/env';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const THEME_MODES: ReadonlyArray<{ mode: ThemeMode; label: string }> = [
  { mode: 'dark', label: 'Dark' },
  { mode: 'light', label: 'Light' },
  { mode: 'system', label: 'System' },
];

export function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const isPro = useAuthStore((s) => selectIsPro(s));
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const reconcilePro = useAuthStore((s) => s.reconcilePro);
  // In-app-purchase controls only appear when the RevenueCat SDK is linked +
  // keyed; otherwise Profile is unchanged (the PRO/FREE pill still shows).
  const iapAvailable = purchases.isAvailable();
  // Web-checkout upgrade path: only when both flags are on (fail-closed until
  // loaded). Hidden entirely during Apple review (payment_web_mobile OFF).
  const webUpgrade = useFeatureFlagsStore(
    (s) =>
      s.isEnabled(FLAGS.subscription) && s.isEnabled(FLAGS.webMobileCheckout),
  );
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const setContentLanguage = useSettingsStore((s) => s.setContentLanguage);
  const copy = paywallCopyFor(contentLanguage);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const openUrl = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  const onRestore = async () => {
    const { isProEntitled } = await purchases.restorePurchases();
    if (isProEntitled) {
      await reconcilePro();
      showDialog({
        title: strings.profile.restoredTitle,
        message: strings.profile.restoredBody,
        buttons: [{ text: strings.modals.ok, style: 'default' }],
      });
    } else {
      showDialog({
        title: strings.profile.restoreNoneTitle,
        message: strings.profile.restoreNoneBody,
        buttons: [{ text: strings.modals.ok, style: 'default' }],
      });
    }
  };

  const onManage = async () => {
    try {
      await purchases.showManageSubscriptions();
    } catch {
      openUrl(MANAGE_SUBSCRIPTION_URL);
    }
  };

  const confirmDelete = () => {
    showDialog({
      title: strings.profile.deleteConfirmTitle,
      message: strings.profile.deleteConfirmBody,
      mood: 'meditating',
      buttons: [
        { text: strings.profile.deleteConfirmCancel, style: 'cancel' },
        {
          text: strings.profile.deleteConfirmConfirm,
          style: 'destructive',
          onPress: () => {
            void deleteAccount().catch(() => {
              showDialog({
                title: strings.profile.deleteError,
                buttons: [{ text: strings.modals.ok, style: 'default' }],
              });
            });
          },
        },
      ],
    });
  };

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

        {/* Upgrade on the web (free users, when the web-checkout flag is on and
            in-app purchases are not the active path). Opens the system browser. */}
        {webUpgrade && !iapAvailable && !isPro && (
          <Animated.View entering={FadeInUp.delay(60)}>
            <Card style={styles.sectionCard}>
              <AppText style={styles.sectionLabel}>
                {strings.profile.billingSection}
              </AppText>
              <PrimaryButton
                label={copy.profileUpgradeCta}
                onPress={() => void openWebUpgrade('profile')}
                height={46}
              />
            </Card>
          </Animated.View>
        )}

        {/* Subscription (only when in-app purchases are available) */}
        {iapAvailable && (
          <Animated.View entering={FadeInUp.delay(60)}>
            <Card style={styles.sectionCard}>
              <AppText style={styles.sectionLabel}>
                {strings.profile.billingSection}
              </AppText>
              {!isPro && (
                <PrimaryButton
                  label={strings.profile.goPro}
                  onPress={() => navigation.navigate('Paywall')}
                  height={46}
                />
              )}
              {isPro && (
                <Pressable
                  onPress={() => void onManage()}
                  style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <AppText secondary style={styles.linkText}>
                    {strings.profile.manageSubscription}
                  </AppText>
                </Pressable>
              )}
              <Pressable
                onPress={() => void onRestore()}
                style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <AppText secondary style={styles.linkText}>
                  {strings.profile.restorePurchases}
                </AppText>
              </Pressable>
            </Card>
          </Animated.View>
        )}

        {/* Content language */}
        <Animated.View entering={FadeInUp.delay(80)}>
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

        {/* Daily reminder */}
        <Animated.View entering={FadeInUp.delay(120)}>
          <ReminderSettingsCard />
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

        {/* Legal & support */}
        <Animated.View entering={FadeInUp.delay(200)}>
          <Card style={styles.sectionCard}>
            <AppText style={styles.sectionLabel}>
              {strings.legal.sectionLabel}
            </AppText>
            <Pressable
              onPress={() => openUrl(PRIVACY_URL)}
              style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText secondary style={styles.linkText}>
                {strings.legal.privacyPolicy}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => openUrl(TERMS_URL)}
              style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText secondary style={styles.linkText}>
                {strings.legal.termsOfService}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
              style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <AppText secondary style={styles.linkText}>
                {strings.legal.contactSupport}
              </AppText>
            </Pressable>
            <AppText dim style={styles.version}>
              {strings.legal.version(APP_VERSION)}
            </AppText>
          </Card>
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInUp.delay(240)}>
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

        {/* Delete account (App Store Guideline 5.1.1(v)) */}
        <Animated.View entering={FadeInUp.delay(280)}>
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteRow,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <AppText dim style={styles.deleteText}>
              {strings.profile.deleteAccount}
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
  sectionCard: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  sectionDescription: { fontSize: 11.5, lineHeight: 16 },
  chipRow: { flexDirection: 'row', gap: 8 },
  linkRow: { paddingVertical: 7 },
  linkText: { fontSize: 13.5 },
  version: { fontSize: 11, marginTop: 2 },
  signOut: {
    borderWidth: 1,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '600' },
  deleteRow: { alignItems: 'center', paddingVertical: 8 },
  deleteText: { fontSize: 13, fontWeight: '500' },
});
