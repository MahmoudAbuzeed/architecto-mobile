import { Platform } from 'react-native';

/**
 * Lazy, guarded access to the native Sign in with Apple module. The require is
 * wrapped so the JS bundle still loads (and the Apple button simply hides) when
 * the native side isn't linked yet — same optional-module pattern the auth
 * store uses for notifications. Once `pod install` links it on iOS, the button
 * appears automatically.
 */

export interface AppleSignInResult {
  identityToken: string;
  /** Only present on the very first authorization; Apple omits it afterwards. */
  fullName?: string;
}

function getModule(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('@invertase/react-native-apple-authentication');
  } catch {
    return null;
  }
}

/** True only on iOS 13+ with the native module linked. */
export function isAppleAuthAvailable(): boolean {
  try {
    return !!getModule()?.appleAuth?.isSupported;
  } catch {
    return false;
  }
}

/**
 * Runs the native Apple flow. Returns the identity token (+ name on first
 * sign-in) to exchange with the backend, or null if the user cancelled or no
 * token was issued.
 */
export async function signInWithApple(): Promise<AppleSignInResult | null> {
  const appleAuth = getModule()?.appleAuth;
  if (!appleAuth) return null;

  try {
    const res = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });
    const identityToken: string | undefined = res?.identityToken ?? undefined;
    if (!identityToken) return null;

    const given = res?.fullName?.givenName ?? '';
    const family = res?.fullName?.familyName ?? '';
    const fullName = `${given} ${family}`.trim() || undefined;
    return { identityToken, fullName };
  } catch (e: any) {
    // 1001 === appleAuth.Error.CANCELED — treat cancel like Google's cancel.
    if (e?.code === appleAuth.Error?.CANCELED || String(e?.code) === '1001') {
      return null;
    }
    throw e;
  }
}
