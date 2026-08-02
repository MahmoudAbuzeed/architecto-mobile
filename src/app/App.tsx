import React, { useEffect } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { RootNavigator } from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import { ModalHost } from '@/components/ModalHost';
import { QuipLoader } from '@/components/QuipLoader';
import { useAuthStore } from '@/store/auth.store';
import { useDailyStore } from '@/store/daily.store';
import { useFeatureFlagsStore } from '@/store/feature-flags.store';
import { useSettingsStore } from '@/store/settings.store';
import { consumeCheckoutPending } from '@/lib/webCheckout';
import { showDialog } from '@/store/ui.store';
import { paywallCopyFor } from '@/i18n/paywall-copy';
import { strings } from '@/i18n/strings';
import {
  ensureChannel,
  wireNotificationEvents,
  checkInitialNotification,
  syncDailyReminder,
  flushPendingDeepLink,
} from '@/services/notifications.service';
import { syncNotificationPrefsOnLogin } from '@/services/prefs-sync';
import { useTheme } from '@/theme/useTheme';
import { THINKING_QUIPS } from '@/lib/quips';

/**
 * After returning from the web checkout, poll /auth/me until the Stripe webhook
 * flips the subscription row, then celebrate. Runs on the first foreground (or
 * cold start) after a checkout was opened — see consumeCheckoutPending().
 */
async function reconcileProAfterCheckout(): Promise<void> {
  const isPro = await useAuthStore.getState().reconcilePro();
  if (!isPro) return; // webhook lagging or the user cancelled — stay quiet
  const copy = paywallCopyFor(useSettingsStore.getState().contentLanguage);
  showDialog({
    title: copy.proUnlockedTitle,
    message: copy.proUnlockedBody,
    mood: 'confetti',
    buttons: [{ text: strings.modals.ok, style: 'default' }],
  });
}

const GOOGLE_WEB_CLIENT_ID =
  '1039210066695-k6jimdh5hhrspujn8qt9lnveg890sfc1.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '1039210066695-76s1ropf1f21mr9qoq4u91cknp4qoge7.apps.googleusercontent.com';

function Bootstrapped() {
  const theme = useTheme();
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Once signed in and bootstrapped: sync notification prefs (device tz + hour),
  // re-arm the reminder, honor a cold-start notification tap. Also catch a
  // checkout that completed while the app was killed in the browser.
  useEffect(() => {
    if (isBootstrapping || !isAuthenticated) return;
    void syncNotificationPrefsOnLogin();
    void syncDailyReminder();
    void checkInitialNotification();
    flushPendingDeepLink();
    if (consumeCheckoutPending()) void reconcileProAfterCheckout();
  }, [isBootstrapping, isAuthenticated]);

  if (isBootstrapping) {
    // Even the cold-start gate follows the no-spinner rule.
    return (
      <View style={[styles.boot, { backgroundColor: theme.bg }]}>
        <QuipLoader pool={THINKING_QUIPS} size={160} />
      </View>
    );
  }

  const navTheme = theme.dark
    ? {
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: theme.bg, card: theme.bg },
      }
    : {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: theme.bg, card: theme.bg },
      };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => flushPendingDeepLink()}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const theme = useTheme();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
      });
    }
    void bootstrap();
    // Feature flags drive the "Upgrade on the web" CTA (payment_web_mobile);
    // fail-closed until this lands, so nothing purchase-related shows meanwhile.
    void useFeatureFlagsStore.getState().fetchFlags();
  }, [bootstrap]);

  // Notifications: create the Android channel, wire the foreground tap handler,
  // and on every foreground refresh the daily hero + re-arm the reminder.
  useEffect(() => {
    void ensureChannel();
    const unwire = wireNotificationEvents();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Flags are public — re-fetch every foreground so a server-side flip
      // (e.g. re-hiding the upgrade CTA for a re-review) takes effect promptly.
      void useFeatureFlagsStore.getState().fetchFlags();
      if (!useAuthStore.getState().isAuthenticated) return;
      // Returning from the web checkout? Poll hard for the flipped subscription
      // and celebrate; otherwise just re-check Pro (catches any webhook that
      // landed while away).
      if (consumeCheckoutPending()) {
        void reconcileProAfterCheckout();
      } else {
        void useAuthStore.getState().loadUser();
      }
      void useDailyStore.getState().fetch();
      void syncDailyReminder();
    });
    return () => {
      unwire();
      sub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />
      <Bootstrapped />
      <ModalHost />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
