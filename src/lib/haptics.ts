// Thin, crash-proof wrapper over react-native-haptic-feedback. Lazily required
// so the app is safe to import even before the native module is linked (same
// defensive pattern as AppleSignInButton) — every call is a no-op if the module
// is missing or throws. Cutting the dependency is a one-file delete.
let RNHaptic: { trigger?: (type: string, opts?: object) => void } | null = null;
try {
  RNHaptic = require('react-native-haptic-feedback').default;
} catch {
  RNHaptic = null;
}

const OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
} as const;

export type HapticKind = 'impactLight' | 'selection' | 'notificationError';

/** Fire a haptic. Silently does nothing if haptics are unavailable. */
export function haptic(kind: HapticKind): void {
  try {
    RNHaptic?.trigger?.(kind, OPTIONS);
  } catch {
    // Never let feedback crash a flow.
  }
}
