import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { RootNavigator } from './navigation/RootNavigator';
import { ModalHost } from '@/components/ModalHost';
import { QuipLoader } from '@/components/QuipLoader';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/useTheme';
import { THINKING_QUIPS } from '@/lib/quips';

const GOOGLE_WEB_CLIENT_ID =
  '1039210066695-k6jimdh5hhrspujn8qt9lnveg890sfc1.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '1039210066695-76s1ropf1f21mr9qoq4u91cknp4qoge7.apps.googleusercontent.com';

function Bootstrapped() {
  const theme = useTheme();
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

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
    <NavigationContainer theme={navTheme}>
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
