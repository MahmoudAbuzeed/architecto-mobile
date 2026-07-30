/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/app/App';
import { name as appName } from './app.json';

// Background notification handler must be registered at module scope (before the
// app mounts) for the notifee-style API. A press just opens the app; the deep
// link is picked up by getInitialNotification / the foreground handler. Guarded
// so a build without the native module doesn't crash on launch.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const notifee = require('react-native-notify-kit');
  const mod = notifee.default ?? notifee;
  mod.onBackgroundEvent?.(async () => {
    // No-op: the tap is handled when the app foregrounds.
  });
} catch {
  // notifications module not present in this build
}

AppRegistry.registerComponent(appName, () => App);
