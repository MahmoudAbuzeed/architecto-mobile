import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, GhostButton, MonoText, PrimaryButton } from './Primitives';
import { ArchieLottie } from './ArchieCircle';
import { useUiStore, AppModal, DialogButton } from '@/store/ui.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { radius } from '@/theme/tokens';

/**
 * Global modal host (mounted once in App.tsx). Two shapes share the same
 * dark-card visual language:
 *  - error/paywall modals routed here by the api interceptor (Archie included);
 *  - `dialog` confirmations surfaced via showDialog — our themed replacement
 *    for native Alert.alert.
 */

type ErrorModal = Exclude<AppModal, { type: 'dialog' }>;

function titleFor(modal: ErrorModal): string {
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
  const activeModal = useUiStore((s) => s.activeModal);
  const dismiss = useUiStore((s) => s.dismiss);

  if (!activeModal) return null;

  if (activeModal.type === 'dialog') {
    return <DialogHost modal={activeModal} dismiss={dismiss} />;
  }
  return <ErrorHost modal={activeModal} dismiss={dismiss} />;
}

function ErrorHost({
  modal,
  dismiss,
}: {
  modal: ErrorModal;
  dismiss: () => void;
}) {
  const theme = useTheme();
  const isPaywall = modal.type === 'paywall';

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
            {isPaywall ? 'PRO' : 'ARCHIE'}
          </MonoText>
          <AppText style={styles.title}>{titleFor(modal)}</AppText>
          <AppText secondary style={styles.message}>
            {/* Paywall copy is client-side and neutral — never steer to an
                external purchase (App Store Guideline 3.1.1). */}
            {isPaywall ? strings.modals.paywallBody : modal.message}
          </AppText>
          <View style={styles.buttons}>
            <GhostButton
              label={isPaywall ? strings.modals.ok : strings.modals.retryLater}
              height={44}
              onPress={dismiss}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DialogHost({
  modal,
  dismiss,
}: {
  modal: Extract<AppModal, { type: 'dialog' }>;
  dismiss: () => void;
}) {
  const theme = useTheme();
  const { title, message, buttons, mood } = modal;

  // The recommended action is the filled primary: the first `default` button,
  // else the cancel button (the safe choice on leave-confirms), else the first.
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const primary =
    buttons.find((b) => b.style === 'default') ?? cancelBtn ?? buttons[0];
  const rest = buttons.filter((b) => b !== primary);

  // A dialog with a cancel button can be dismissed by the backdrop / hardware
  // back (both run cancel). Single-CTA dialogs (no cancel) block like a native
  // alert — the user must tap the button.
  const dismissable = !!cancelBtn;

  const run = (btn?: DialogButton) => {
    dismiss();
    btn?.onPress?.();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => dismissable && run(cancelBtn)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={dismissable ? () => run(cancelBtn) : undefined}
      >
        {/* Swallows taps on the card body so they don't dismiss via backdrop. */}
        <Pressable
          onPress={() => undefined}
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.borderStrong },
          ]}
        >
          {mood && (
            <>
              <View style={styles.archie}>
                <ArchieLottie mood={mood} size={64} />
              </View>
              <MonoText
                weight="semiBold"
                color={theme.textSecondary}
                style={styles.kicker}
              >
                ARCHIE
              </MonoText>
            </>
          )}
          <AppText style={styles.title}>{title}</AppText>
          {!!message && (
            <AppText secondary style={styles.message}>
              {message}
            </AppText>
          )}
          <View style={styles.buttons}>
            {primary && (
              <PrimaryButton
                label={primary.text}
                height={48}
                onPress={() => run(primary)}
              />
            )}
            {rest.map((b, i) => (
              <GhostButton
                key={`${b.text}-${i}`}
                label={b.text}
                height={46}
                danger={b.style === 'destructive'}
                onPress={() => run(b)}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
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
