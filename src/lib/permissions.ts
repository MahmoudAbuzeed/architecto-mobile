import { PermissionsAndroid, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

/**
 * Pre-flight voice permission priming (plan A3 Fix 4). No
 * react-native-permissions dependency — Android goes through
 * PermissionsAndroid, iOS through Voice.isAvailable(), which prompts for
 * speech-recognition auth when undetermined and resolves after the user
 * answers. (The iOS *mic* dialog still lands on the first real hold — fine,
 * denial now surfaces a proper message instead of a silent bounce.)
 */
export type VoicePermissionOutcome = 'granted' | 'blocked' | 'unknown';

export async function primeVoicePermissions(): Promise<VoicePermissionOutcome> {
  if (Platform.OS === 'android') {
    try {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (status === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
      if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }
      // Plain "denied": re-askable on the next attempt, so not blocked.
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  try {
    const available = await Voice.isAvailable();
    return available ? 'granted' : 'blocked';
  } catch {
    return 'unknown';
  }
}

/**
 * Prompt for notification permission (daily reminder). One call covers both the
 * iOS prompt and the Android 13+ POST_NOTIFICATIONS runtime dialog (auto-granted
 * below API 33). notify-kit is required lazily + guarded so a build without the
 * native module (or a bundle before it's installed) degrades to 'unknown'
 * instead of throwing.
 */
export type NotifPermissionOutcome = 'granted' | 'blocked' | 'unknown';

export async function primeNotificationPermissions(): Promise<NotifPermissionOutcome> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notifee = require('react-native-notify-kit');
    const mod = notifee.default ?? notifee;
    const AuthorizationStatus = notifee.AuthorizationStatus ?? {
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    };
    const settings = await mod.requestPermission();
    const status = settings?.authorizationStatus;
    if (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    ) {
      return 'granted';
    }
    if (status === AuthorizationStatus.DENIED) return 'blocked';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
