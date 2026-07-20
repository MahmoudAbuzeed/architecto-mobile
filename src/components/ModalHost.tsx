import React from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { AppText, GhostButton, MonoText, PrimaryButton } from './Primitives';
import { ArchieLottie } from './ArchieCircle';
import { useUiStore, AppModal } from '@/store/ui.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { WEB_PRICING_URL } from '@/services/env';
import { radius } from '@/theme/tokens';

/**
 * Global error-modal host (mounted once in App.tsx). The api interceptor
 * routes coded backend errors here through ui.store — same dark-card visual
 * language as the rest of the app, Archie included.
 */

function titleFor(modal: AppModal): string {
  switch (modal.type) {
    case 'paywall':
      return strings.modals.paywallTitle;
    case 'ai-unavailable':
      return strings.modals.aiDownTitle;
    case 'rate-limit':
      return strings.modals.rateLimitTitle;
    case 'offline':
      return strings.modals.offlineTitle;
    default:
      return strings.modals.genericTitle;
  }
}

export function ModalHost() {
  const theme = useTheme();
  const activeModal = useUiStore((s) => s.activeModal);
  const dismiss = useUiStore((s) => s.dismiss);

  if (!activeModal) return null;

  const isPaywall = activeModal.type === 'paywall';

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.borderStrong },
          ]}
        >
          <View style={styles.archie}>
            <ArchieLottie mood="meditating" size={92} />
          </View>
          <MonoText weight="semiBold" color={theme.textSecondary} style={styles.kicker}>
            {activeModal.type === 'paywall' ? 'PRO' : 'ARCHIE'}
          </MonoText>
          <AppText style={styles.title}>{titleFor(activeModal)}</AppText>
          <AppText secondary style={styles.message}>
            {activeModal.message}
          </AppText>
          <View style={styles.buttons}>
            {isPaywall && (
              <PrimaryButton
                label={strings.modals.upgradeCta}
                height={46}
                onPress={() => {
                  dismiss();
                  Linking.openURL(WEB_PRICING_URL).catch(() => undefined);
                }}
              />
            )}
            <GhostButton
              label={isPaywall ? strings.modals.ok : strings.modals.retryLater}
              height={44}
              bordered={!isPaywall}
              onPress={dismiss}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  archie: { marginBottom: 2 },
  kicker: { fontSize: 10, letterSpacing: 2 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 8, marginTop: 10 },
});
