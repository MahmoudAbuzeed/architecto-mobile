import { Platform } from 'react-native';

// Dev: iOS simulator reaches the Mac's localhost directly; the Android
// emulator reaches it via 10.0.2.2. Debug builds allow cleartext for this
// host only (android/app/src/debug/AndroidManifest.xml).
// TODO(user): set the production URL before a release build.
const PROD_API_URL = 'https://architecto.app/api';

export const API_BASE_URL = __DEV__
  ? Platform.select({
      ios: 'http://localhost:3001/api',
      android: 'http://10.0.2.2:3001/api',
      default: 'http://localhost:3001/api',
    })
  : PROD_API_URL;

/** Where "Upgrade on the web" links land. */
export const WEB_PRICING_URL = 'https://architecto.app/pricing';
