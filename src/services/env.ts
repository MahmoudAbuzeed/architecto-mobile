import { Platform } from 'react-native';

// Dev: iOS simulator reaches the Mac's localhost directly; the Android
// emulator reaches it via 10.0.2.2. Debug builds allow cleartext for this
// host only (android/app/src/debug/AndroidManifest.xml).
const PROD_API_URL = 'https://architecto.app/api';

export const API_BASE_URL = __DEV__
  ? Platform.select({
      ios: 'http://localhost:3001/api',
      android: 'http://10.0.2.2:3001/api',
      default: 'http://localhost:3001/api',
    })
  : PROD_API_URL;

// Hosted legal pages + support channel, surfaced from Profile and the sign-in
// screens. App Store review requires the privacy policy to be reachable both
// in the app and via the App Store Connect metadata URL.
export const PRIVACY_URL = 'https://architecto.app/privacy';
export const TERMS_URL = 'https://architecto.app/terms';
export const SUPPORT_EMAIL = 'support@architecto.app';

/** Marketing version shown in Profile. Keep in sync with iOS MARKETING_VERSION. */
export const APP_VERSION = '1.0';
