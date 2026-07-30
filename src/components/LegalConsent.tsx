import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { AppText } from './Primitives';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { PRIVACY_URL, TERMS_URL } from '@/services/env';

/**
 * "By continuing you agree to our Terms & Privacy Policy" — shown on the
 * sign-in screens so account creation has visible consent links (App Store
 * Guideline 5.1.1). The two phrases open the hosted pages.
 */
export function LegalConsent() {
  const theme = useTheme();
  const linkStyle = {
    color: theme.textSecondary,
    textDecorationLine: 'underline' as const,
  };
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <AppText dim style={styles.text}>
      {strings.legal.agreePrefix}
      <Text style={linkStyle} onPress={() => open(TERMS_URL)}>
        {strings.legal.terms}
      </Text>
      {strings.legal.and}
      <Text style={linkStyle} onPress={() => open(PRIVACY_URL)}>
        {strings.legal.privacy}
      </Text>
      {strings.legal.agreeSuffix}
    </AppText>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 6 },
});
