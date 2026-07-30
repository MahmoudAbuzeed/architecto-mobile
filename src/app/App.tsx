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

const GOOGLE_WEB_CLIENT_ID =
  '1039210066695-k6jimdh5hhrspujn8qt9lnveg890sfc1.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '1039210066695-76s1ropf1f21mr9qoq4u91cknp4qoge7.apps.googleusercontent.com';

function Bootstrapped() {
  const theme = useTheme();
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Once signed in and bootstrapped: sync notification prefs (device tz + hour),
  // re-arm the reminder, honor a cold-start notification tap.
  useEffect(() => {
    if (isBootstrapping || !isAuthenticated) return;
    void syncNotificationPrefsOnLogin();
    void syncDailyReminder();
    void checkInitialNotification();
    flushPendingDeepLink();
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
  }, [bootstrap]);

  // Notifications: create the Android channel, wire the foreground tap handler,
  // and on every foreground refresh the daily hero + re-arm the reminder.
  useEffect(() => {
    void ensureChannel();
    const unwire = wireNotificationEvents();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAuthStore.getState().isAuthenticated) {
        void useDailyStore.getState().fetch();
        void syncDailyReminder();
      }
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
