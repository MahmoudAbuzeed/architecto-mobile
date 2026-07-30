import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Card,
  MonoText,
  Screen,
} from '@/components/Primitives';
import { ArchieCircle, ArchieLottie } from '@/components/ArchieCircle';
import { WaveBars } from '@/components/WaveBars';
import { HoldToTalkButton } from '@/components/HoldToTalkButton';
import { TranscriptView } from '@/components/TranscriptView';
import { QuipLoader } from '@/components/QuipLoader';
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  KeyboardIcon,
  MicIcon,
  MissedIcon,
} from '@/components/icons';
import { useRepStore } from '@/store/rep.store';
import { useSettingsStore } from '@/store/settings.store';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTtsPlayback } from '@/hooks/useTtsPlayback';
import { useCountdown } from '@/hooks/useCountdown';
import { ttsService } from '@/services/tts.service';
import { primeVoicePermissions } from '@/lib/permissions';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { GENERATING_QUIPS, pickQuip, TYPING_QUIPS } from '@/lib/quips';
import { isArabic, toSpeechLocale } from '@/lib/languages';
import { formatSeconds } from '@/lib/format';
import { REP_BUDGET_SECONDS } from '@/lib/constants';
import { radius } from '@/theme/tokens';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RepSession'>;

/** How many "SO FAR" coverage rows show before collapsing to "+N more". */
const SO_FAR_MAX_ROWS = 3;

/**
 * One screen owns the whole rep loop — asking → recording → typing →
 * submitting — as a state machine (rep.store), so the audio session and
 * countdown survive voice ↔ typed switches without navigator teardown.
 * Probing follow-ups reuse the same loop: the `turn` swaps the question
 * bubble while one five-minute countdown spans the whole session.
 */
export function RepSessionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const rtl = isArabic(contentLanguage);

  const phase = useRepStore((s) => s.phase);
  const turn = useRepStore((s) => s.turn);
  const provisional = useRepStore((s) => s.provisional);
  const typedDraft = useRepStore((s) => s.typedDraft);
  const result = useRepStore((s) => s.result);
  const alreadyCompleted = useRepStore((s) => s.alreadyCompleted);
  const error = useRepStore((s) => s.error);
  const begin = useRepStore((s) => s.begin);
  const setPhase = useRepStore((s) => s.setPhase);
  const setTypedDraft = useRepStore((s) => s.setTypedDraft);
  const submit = useRepStore((s) => s.submit);
  const finalizeLocal = useRepStore((s) => s.finalizeLocal);
  const reset = useRepStore((s) => s.reset);

  const speech = useSpeechRecognition(toSpeechLocale(contentLanguage));
  const tts = useTtsPlayback();

  // Set when the pre-flight priming reports the mic permanently blocked —
  // merged into the same banner/typing-fallback path as live speech errors.
  const [primeBlocked, setPrimeBlocked] = useState(false);

  // One wall-clock five-minute budget spans the whole session (probes
  // included): useCountdown keeps its deadline across paused phases.
  const budget = REP_BUDGET_SECONDS;
  const remaining = useCountdown(
    budget,
    phase === 'asking' || phase === 'recording',
  );

  const playQuestion = useCallback(async () => {
    // Probe questions are text-only (no audio endpoint for them).
    if (useRepStore.getState().turn.kind === 'probe') return;
    try {
      const path = params.drillSlug
        ? `/rep/drills/${encodeURIComponent(params.drillSlug)}/audio`
        : '/rep/daily/audio';
      const day = new Date().toISOString().slice(0, 10);
      const file = await ttsService.getOrFetch(
        path,
        contentLanguage,
        `${params.drillSlug ?? 'daily'}|${day}`,
      );
      await tts.play(file);
    } catch {
      // No audio? The question bubble is on screen — voice is enhancement.
    }
  }, [contentLanguage, params.drillSlug, tts]);

  useEffect(() => {
    begin({
      drillSlug: params.drillSlug,
      title: params.title,
      prompt: params.prompt,
      budgetSeconds: budget,
    });
    if (useSettingsStore.getState().micPrimed) {
      void playQuestion();
    } else {
      // First rep ever: explain before the OS interrupts the first hold.
      Alert.alert(
        strings.rep.micExplainerTitle,
        strings.rep.micExplainerBody,
        [
          {
            text: strings.rep.micExplainerCta,
            onPress: () => {
              void (async () => {
                const outcome = await primeVoicePermissions();
                useSettingsStore.getState().setMicPrimed(true);
                if (outcome === 'blocked') setPrimeBlocked(true);
                void playQuestion();
              })();
            },
          },
        ],
      );
    }
    return () => {
      void tts.stop();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, []);

  // A speech error while asking/recording drops the user onto the keyboard
  // with the explanation visible — once per error (ref-guarded).
  const voiceError =
    speech.error ?? (primeBlocked ? strings.rep.micDeniedBody : null);
  const voiceErrorKind = speech.errorKind ?? (primeBlocked ? 'permission' : null);
  const errorHandledRef = useRef(false);
  useEffect(() => {
    if (!voiceError) {
      errorHandledRef.current = false;
      return;
    }
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;
    const current = useRepStore.getState().phase;
    if (current === 'asking' || current === 'recording') {
      setPhase('typing');
    }
  }, [voiceError, setPhase]);

  // Budget spent mid-probing (not while recording/grading): grade what we
  // have — the first answer is already banked server-side.
  useEffect(() => {
    if (remaining > 0) return;
    const s = useRepStore.getState();
    if (
      s.turn.kind === 'probe' &&
      (s.phase === 'asking' || s.phase === 'typing')
    ) {
      finalizeLocal();
    }
  }, [remaining, phase, finalizeLocal]);

  // Every way out of a live rep — the X, Android hardware back, any pop —
  // funnels through this guard: blocked while grading, confirmed otherwise.
  // 'done' lets the Feedback handoff below pass through untouched.
  usePreventRemove(phase !== 'done', ({ data }) => {
    if (phase === 'submitting') return;
    if (turn.kind === 'probe') {
      // Mid-probing there's a third door: bank the combined state so far.
      Alert.alert(
        strings.rep.closeConfirmTitle,
        strings.rep.closeConfirmProbingBody,
        [
          { text: strings.rep.closeConfirmStay, style: 'cancel' },
          { text: strings.rep.gradeWhatIHave, onPress: () => finalizeLocal() },
          {
            text: strings.rep.closeConfirmLeave,
            style: 'destructive',
            onPress: () => navigation.dispatch(data.action),
          },
        ],
      );
      return;
    }
    Alert.alert(
      strings.rep.closeConfirmTitle,
      strings.rep.closeConfirmBody,
      [
        { text: strings.rep.closeConfirmStay, style: 'cancel' },
        {
          text: strings.rep.closeConfirmLeave,
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });

  // Grading finished → hand off to Feedback.
  useEffect(() => {
    if (phase !== 'done') return;
    if (result) {
      navigation.replace('Feedback', { result });
    } else if (alreadyCompleted) {
      navigation.goBack(); // Home refetches and shows the completed state.
    }
  }, [phase, result, alreadyCompleted, navigation]);

  const onHoldStart = useCallback(async () => {
    setPhase('recording');
    // Serialize the audio session: playback must fully stop before the
    // recognizer grabs the mic (iOS play/record session race).
    await tts.stop();
    void speech.start();
  }, [speech, setPhase, tts]);

  const onHoldEnd = useCallback(async () => {
    // Guard: a cancelled/terminated press can fire this outside recording.
    if (useRepStore.getState().phase !== 'recording') return;
    const transcript = await speech.stop();
    if (transcript) {
      void submit(transcript, 'voice', contentLanguage);
    } else {
      setPhase('asking');
    }
  }, [speech, submit, contentLanguage, setPhase]);

  const probing = turn.kind === 'probe';
  const questionText = turn.kind === 'probe' ? turn.probe.question : params.prompt;

  const headerLabel =
    phase === 'recording'
      ? strings.rep.recording
      : phase === 'typing'
        ? `${strings.rep.typing} · ${params.title.toUpperCase().slice(0, 24)}`
        : phase === 'submitting'
          ? strings.rep.grading
          : turn.kind === 'probe'
            ? strings.rep.followUpKicker(turn.number, turn.total)
            : `${params.drillSlug ? strings.rep.drill : strings.rep.todaysRep} · ${params.title.toUpperCase().slice(0, 24)}`;

  const inlineError = error ?? voiceError;

  // "SO FAR" coverage strip data (probing only): covered ✓ then missed ·,
  // capped, with the remainder folded into "+N more".
  const soFarRows = probing && provisional
    ? [
        ...provisional.covered.map((text) => ({ text, covered: true })),
        ...provisional.missed.map((text) => ({ text, covered: false })),
      ]
    : [];
  const soFarOverflow = Math.max(0, soFarRows.length - SO_FAR_MAX_ROWS);

  // ── Submitting: the app-wide quip loader (design 2d) ─────────────────
  if (phase === 'submitting') {
    return (
      <Screen edges={['top', 'bottom']} style={styles.centerContent}>
        <View style={styles.gradingHeader}>
          <MonoText weight="medium" color={theme.textSecondary} style={styles.headerLabel}>
            {strings.rep.grading}
          </MonoText>
        </View>
        <QuipLoader pool={GENERATING_QUIPS} />
        <AppText dim style={styles.noSpinners}>
          {strings.rep.noSpinners}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* goBack is intercepted by the usePreventRemove guard above. */}
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <CloseIcon size={18} color={theme.textSecondary} />
          </Pressable>
          <MonoText weight="medium" color={theme.textSecondary} style={styles.headerLabel}>
            {headerLabel}
          </MonoText>
          <MonoText
            weight="semiBold"
            color={phase === 'recording' ? theme.accent : theme.textDim}
            style={styles.timer}
          >
            {formatSeconds(remaining)}
          </MonoText>
        </View>

        {inlineError && (
          <Card style={styles.errorCard}>
            <AppText secondary style={styles.errorText}>
              {inlineError}
            </AppText>
            {voiceErrorKind === 'permission' && (
              <Pressable
                onPress={() => void Linking.openSettings()}
                hitSlop={8}
                style={styles.openSettings}
              >
                <AppText style={[styles.openSettingsText, { color: theme.blue }]}>
                  {strings.rep.openSettings}
                </AppText>
              </Pressable>
            )}
          </Card>
        )}

        {phase === 'typing' ? (
          // ── Typing: quiet-place mode (design 2c) ───────────────────────
          <View style={styles.flexPadded}>
            <View style={styles.typingBubbleRow}>
              <ArchieLottie mood="brain" size={34} />
              <Card style={styles.typingQuipBubble}>
                <AppText secondary style={[styles.typingQuip, rtl && styles.rtlText]}>
                  {probing ? `“${questionText}”` : pickQuip(TYPING_QUIPS)}
                </AppText>
              </Card>
            </View>
            <Card style={styles.editorCard}>
              <TextInput
                multiline
                autoFocus
                value={typedDraft}
                onChangeText={setTypedDraft}
                placeholder={probing ? questionText : params.title}
                placeholderTextColor={theme.textDim}
                style={[
                  styles.editor,
                  { color: theme.text },
                  rtl && styles.rtlText,
                ]}
              />
            </Card>
            <View style={styles.typingActions}>
              <Pressable
                style={styles.switchToVoice}
                onPress={() => setPhase('asking')}
              >
                <MicIcon size={13} color={theme.textSecondary} />
                <AppText secondary style={styles.switchToVoiceText}>
                  {strings.rep.switchToVoice}
                </AppText>
              </Pressable>
              <Pressable
                style={[
                  styles.submitPill,
                  {
                    backgroundColor: theme.action,
                    opacity: typedDraft.trim() ? 1 : 0.5,
                  },
                ]}
                disabled={!typedDraft.trim()}
                onPress={() => void submit(typedDraft, 'typed', contentLanguage)}
              >
                <AppText style={[styles.submitText, { color: theme.actionText }]}>
                  {strings.rep.submit}
                </AppText>
                <ArrowRightIcon size={13} color={theme.actionText} />
              </Pressable>
            </View>
          </View>
        ) : (
          // ── Asking + Recording share one layout so the mic Pressable is
          // never unmounted mid-press (the release must land on the same
          // element that saw the press). Center content swaps by phase.
          <View style={styles.flexPadded}>
            {phase === 'recording' ? (
              <>
                <View style={styles.interviewerRow}>
                  <ArchieLottie mood="brain" size={44} />
                  <AppText secondary style={styles.interviewerNote}>
                    {strings.rep.interviewerWrites}
                  </AppText>
                </View>
                <TranscriptView transcript={speech.transcript} rtl={rtl} />
                <View style={styles.recordingWave}>
                  <WaveBars active color={theme.accent} variant="recording" />
                </View>
              </>
            ) : (
              <View style={styles.askCenter}>
                <ArchieCircle mood="teacher" bob />
                <WaveBars active={tts.isPlaying} color={theme.action} />
                {probing && soFarRows.length > 0 && (
                  <Card style={styles.soFarCard}>
                    <MonoText
                      weight="semiBold"
                      color={theme.textSecondary}
                      style={styles.soFarKicker}
                    >
                      {strings.rep.soFar}
                    </MonoText>
                    {soFarRows.slice(0, SO_FAR_MAX_ROWS).map((row) => (
                      <View key={`${row.covered}-${row.text}`} style={styles.soFarRow}>
                        {row.covered ? (
                          <CheckIcon size={12} color={theme.emerald} />
                        ) : (
                          <MissedIcon size={12} />
                        )}
                        <AppText
                          secondary={!row.covered}
                          numberOfLines={1}
                          style={[styles.soFarText, rtl && styles.rtlText]}
                        >
                          {row.text}
                        </AppText>
                      </View>
                    ))}
                    {soFarOverflow > 0 && (
                      <AppText dim style={styles.soFarMore}>
                        {strings.rep.soFarMore(soFarOverflow)}
                      </AppText>
                    )}
                  </Card>
                )}
                <Card style={styles.questionBubble}>
                  <MonoText
                    weight="semiBold"
                    color={theme.textSecondary}
                    style={styles.archieLabel}
                  >
                    {strings.rep.archie}
                  </MonoText>
                  <AppText style={[styles.questionText, rtl && styles.rtlText]}>
                    “{questionText}”
                  </AppText>
                </Card>
              </View>
            )}
            <View style={styles.askBottom}>
              <View
                style={[
                  styles.inputRow,
                  phase === 'recording' && styles.inputRowRecording,
                ]}
              >
                {phase !== 'recording' && (
                  <Pressable
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.borderStrong,
                      },
                    ]}
                    onPress={() => {
                      void tts.stop();
                      setPhase('typing');
                    }}
                  >
                    <KeyboardIcon size={15} color={theme.textDim} />
                    <AppText dim style={styles.typePillText}>
                      {strings.rep.typeInstead}
                    </AppText>
                  </Pressable>
                )}
                <HoldToTalkButton
                  recording={phase === 'recording'}
                  size={66}
                  onPressIn={() => void onHoldStart()}
                  onPressOut={() => void onHoldEnd()}
                />
              </View>
              <View style={styles.hintsRow}>
                {phase === 'recording' ? (
                  <AppText secondary style={[styles.holdHint, styles.centerHint]}>
                    {strings.rep.releaseToFinish}
                  </AppText>
                ) : (
                  <>
                    {!probing ? (
                      <Pressable onPress={() => void playQuestion()}>
                        <AppText dim style={styles.repeatHint}>
                          {strings.rep.repeatQuestion}
                        </AppText>
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    <AppText secondary style={styles.holdHint}>
                      {strings.rep.holdMicHint}
                    </AppText>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexPadded: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    padding: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  gradingHeader: { position: 'absolute', top: 70 },
  headerLabel: { fontSize: 11, letterSpacing: 1.1 },
  timer: { fontSize: 12 },
  errorCard: { marginHorizontal: 24, marginBottom: 8, padding: 12, gap: 6 },
  errorText: { fontSize: 12.5, lineHeight: 18 },
  openSettings: { alignSelf: 'flex-start' },
  openSettingsText: { fontSize: 12.5, fontWeight: '600' },

  askCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  soFarCard: {
    alignSelf: 'stretch',
    maxWidth: 320,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  soFarKicker: { fontSize: 9.5, letterSpacing: 1.4 },
  soFarRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  soFarText: { flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: '500' },
  soFarMore: { fontSize: 10.5 },
  questionBubble: {
    borderTopLeftRadius: 4,
    borderRadius: radius.bubble,
    padding: 18,
    maxWidth: 320,
    gap: 8,
  },
  archieLabel: { fontSize: 10, letterSpacing: 1.4 },
  questionText: { fontSize: 17, lineHeight: 24.5, fontWeight: '500' },
  askBottom: { gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputRowRecording: { justifyContent: 'center' },
  centerHint: { flex: 1, textAlign: 'center' },
  typePill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  typePillText: { fontSize: 14 },
  hintsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  repeatHint: { fontSize: 12, fontWeight: '500' },
  holdHint: { fontSize: 12, fontWeight: '600' },

  interviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  interviewerNote: { fontSize: 12, fontStyle: 'italic' },
  recordingWave: { marginBottom: 16 },

  typingBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  typingQuipBubble: {
    flex: 1,
    minWidth: 0,
    borderTopLeftRadius: 3,
    borderRadius: radius.md,
    padding: 11,
  },
  typingQuip: { fontSize: 12.5, lineHeight: 19 },
  editorCard: { flex: 1, marginTop: 12, padding: 14 },
  editor: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  typingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  switchToVoice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchToVoiceText: { fontSize: 12, fontWeight: '600' },
  submitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  submitText: { fontSize: 13, fontWeight: '600' },
  noSpinners: { fontSize: 11.5, textAlign: 'center', lineHeight: 17 },
});
