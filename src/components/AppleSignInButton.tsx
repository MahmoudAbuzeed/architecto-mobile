import React from 'react';
import { StyleSheet } from 'react-native';
import { isAppleAuthAvailable } from '@/lib/appleAuth';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';

// Lazily grab the official AppleButton so this file is safe to import even
// before the native module is linked (require throws -> button hidden).
let AppleButton: any = null;
try {
  AppleButton = require('@invertase/react-native-apple-authentication').AppleButton;
} catch {
  AppleButton = null;
}

/**
 * Apple's HIG-compliant "Continue with Apple" button. Renders nothing when
 * Sign in with Apple is unavailable (non-iOS, iOS < 13, or native not linked),
 * so callers can drop it in unconditionally.
 */
export function AppleSignInButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  if (!AppleButton || !isAppleAuthAvailable()) return null;

  return (
    <AppleButton
      buttonStyle={theme.dark ? AppleButton.Style.WHITE : AppleButton.Style.BLACK}
      buttonType={AppleButton.Type.CONTINUE}
      cornerRadius={radius.md}
      style={styles.button}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', height: 50 },
});
