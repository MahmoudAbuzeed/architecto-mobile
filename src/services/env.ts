import { Platform } from 'react-native';

// Dev: iOS simulator reaches the Mac's localhost directly; the Android
// emulator reaches it via 10.0.2.2. Debug builds allow cleartext for this
// host only (android/app/src/debug/AndroidManifest.xml).
const PROD_API_URL = 'https://www.archeticto.com/api';

const DEV_API_URL = Platform.select({
  ios: 'http://localhost:3001/api',
  android: 'http://10.0.2.2:3001/api',
  default: 'http://localhost:3001/api',
});

// Set to true to make dev/simulator builds talk to the live prod backend
// instead of localhost:3001. Flip back to false to return to local dev.
const USE_PROD_IN_DEV = true;

export const API_BASE_URL = __DEV__
  ? USE_PROD_IN_DEV
    ? PROD_API_URL
    : DEV_API_URL
  : PROD_API_URL;

// Web app origin for the checkout handoff (opened in the system browser). The
// app never sells anything itself — the "Upgrade on the web" flow lands the
// signed-in user on this host's /pricing. For end-to-end local testing point
// this at the local Vite server (http://localhost:5173) and revert before
// committing.
export const WEB_APP_URL = 'https://www.archeticto.com';

// Hosted legal pages + support channel, surfaced from Profile and the sign-in
// screens. App Store review requires the privacy policy to be reachable both
// in the app and via the App Store Connect metadata URL.
export const PRIVACY_URL = 'https://architecto.app/privacy';
export const TERMS_URL = 'https://architecto.app/terms';
export const SUPPORT_EMAIL = 'support@architecto.app';

/** Marketing version shown in Profile. Keep in sync with iOS MARKETING_VERSION. */
export const APP_VERSION = '1.0';

// RevenueCat publishable SDK keys (safe to ship in the client). Sandbox and
// production share the same key — the environment follows the signed-in App
// Store account. Fill these from the RevenueCat dashboard; while empty the IAP
// layer stays disabled and the app falls back to the soft paywall dialog.
// Android stays '' until the Play integration is set up.
export const REVENUECAT_IOS_KEY = '';
export const REVENUECAT_ANDROID_KEY = '';

/** Deep link to the OS subscription-management screen (Manage subscription). */
export const MANAGE_SUBSCRIPTION_URL =
  Platform.select({
    ios: 'https://apps.apple.com/account/subscriptions',
    android: 'https://play.google.com/store/account/subscriptions',
    default: 'https://apps.apple.com/account/subscriptions',
  }) ?? 'https://apps.apple.com/account/subscriptions';
