import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AppText, Card, MonoText, Screen } from '@/components/Primitives';
import { ArchieCircle } from '@/components/ArchieCircle';
import { ScoreRing } from '@/components/ScoreRing';
import { HoldToTalkButton } from '@/components/HoldToTalkButton';
import { QuipLoader } from '@/components/QuipLoader';
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ChevronRightIcon,
  FlameOutlineIcon,
  KeyboardIcon,
  MicIcon,
  MissedIcon,
} from '@/components/icons';
import { useSettingsStore } from '@/store/settings.store';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { repService } from '@/services/rep.service';
import { toAppError } from '@/lib/api-error';
import { scoreColor, scoreWord } from '@/lib/scores';
import { isArabic, toSpeechLocale } from '@/lib/languages';
import { GENERATING_QUIPS } from '@/lib/quips';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { radius } from '@/theme/tokens';
import type { RootStackParamList } from '@/app/navigation/types';
import type { InputMode } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Feedback'>;

/** Follow-up ("redeem yourself") interaction state machine. */
type FollowUpPhase =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'typing' }
  | { kind: 'submitting' }
  | { kind: 'done'; feedback: string; xpEarned: number | null };

const SECTION_DELAY = 120;

/**
 * Grading result (design 1f): verdict from Archie, score ring + coverage,
 * optional follow-up redemption, and the XP/streak footer.
 */
export function FeedbackScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const result = params.result;
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const rtl = isArabic(contentLanguage);

  const speech = useSpeechRecognition(toSpeechLocale(contentLanguage));
  const [phase, setPhase] = useState<FollowUpPhase>({ kind: 'idle' });
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submitFollowUp = useCallback(
    async (transcript: string, inputMode: InputMode) => {
      const followUp = result.followUp;
      const text = transcript.trim();
      if (!followUp || !text) {
        setPhase({ kind: 'idle' });
        return;
      }
      setError(null);
      setPhase({ kind: 'submitting' });
      try {
        const res = await repService.submitFollowUp(followUp.id, {
          transcript: text,
          inputMode,
        });
        setPhase({ kind: 'done', feedback: res.feedback, xpEarned: res.xpEarned });
      } catch (e) {
        const err = toAppError(e);
        if (err.code === 'FOLLOW_UP_ALREADY_ANSWERED') {
          setPhase({ kind: 'done', feedback: 'Already redeemed.', xpEarned: null });
        } else {
          setError(err.message);
          setPhase({ kind: 'idle' });
        }
      }
    },
    [result.followUp],
  );

  const onHoldStart = useCallback(() => {
    setError(null);
    setPhase({ kind: 'recording' });
    void speech.start();
  }, [speech]);

  const onHoldEnd = useCallback(async () => {
    const transcript = await speech.stop();
    if (transcript) {
      void submitFollowUp(transcript, 'voice');
    } else {
      setPhase({ kind: 'idle' });
    }
  }, [speech, submitFollowUp]);

  const onDone = useCallback(() => {
    if (result.celebrate) {
      navigation.replace('Celebration', {
        streak: result.streak.current,
        isNewRecord: result.streak.isNewRecord,
        xpToday: result.xpEarned,
      });
    } else {
      navigation.popToTop();
    }
  }, [navigation, result]);

  const inlineError = error ?? speech.error;
  let section = 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Verdict header */}
          <Animated.View
            entering={FadeInUp.delay(section++ * SECTION_DELAY).duration(450)}
            style={styles.headerRow}
          >
            <ArchieCircle mood="student" size={96} />
            <View style={styles.headerText}>
              <AppText style={[styles.verdict, rtl && styles.rtlText]}>
                “{result.verdict}”
              </AppText>
            </View>
          </Animated.View>

          {/* Score + coverage */}
          <Animated.View
            entering={FadeInUp.delay(section++ * SECTION_DELAY).duration(450)}
            style={styles.scoreRow}
          >
            <Card style={styles.scoreCard}>
              <ScoreRing score={result.score} size={76} />
              <AppText
                style={[styles.scoreWord, { color: scoreColor(result.score, theme) }]}
              >
                {scoreWord(result.score)}
              </AppText>
            </Card>
            <Card style={styles.coverageCard}>
              {result.covered.map((item) => (
                <View key={`c-${item}`} style={styles.coverageRow}>
                  <CheckIcon size={14} color={theme.emerald} />
                  <AppText style={[styles.coveredText, rtl && styles.rtlText]}>
                    {item}
                  </AppText>
                </View>
              ))}
              {result.missed.map((item) => (
                <View key={`m-${item}`} style={styles.coverageRow}>
                  <MissedIcon size={14} />
                  <AppText
                    secondary
                    style={[styles.missedText, rtl && styles.rtlText]}
                  >
                    {item}
                  </AppText>
                </View>
              ))}
            </Card>
          </Animated.View>

          {/* Follow-up: redeem yourself. No entering animation — Fabric
              hit-testing desyncs inside animating subtrees (RN #51621),
              and this card holds pressables. */}
          {result.followUp && (
            <View>
              <Card elevated style={styles.followUpCard}>
                <MonoText
                  weight="semiBold"
                  color={theme.textSecondary}
                  style={styles.followUpKicker}
                >
                  {strings.feedback.redeem}
                </MonoText>

                {phase.kind === 'done' ? (
                  <>
                    <AppText
                      secondary
                      style={[styles.followUpFeedback, rtl && styles.rtlText]}
                    >
                      {phase.feedback}
                    </AppText>
                    {phase.xpEarned !== null && (
                      <MonoText weight="bold" color={theme.xp} style={styles.followUpXp}>
                        {strings.feedback.xp(phase.xpEarned)}
                      </MonoText>
                    )}
                  </>
                ) : (
                  <>
                    <AppText style={[styles.followUpQuestion, rtl && styles.rtlText]}>
                      “{result.followUp.question}”
                    </AppText>

                    {inlineError && phase.kind !== 'submitting' && (
                      <AppText secondary style={styles.errorText}>
                        {inlineError}
                      </AppText>
                    )}

                    {phase.kind === 'submitting' ? (
                      <View style={styles.submittingBox}>
                        <QuipLoader
                          pool={GENERATING_QUIPS}
                          showArchie={false}
                          size={0}
                        />
                      </View>
                    ) : phase.kind === 'typing' ? (
                      <>
                        <View
                          style={[
                            styles.editorBox,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <TextInput
                            multiline
                            autoFocus
                            value={draft}
                            onChangeText={setDraft}
                            placeholder={strings.rep.typeInstead}
                            placeholderTextColor={theme.textDim}
                            style={[
                              styles.editor,
                              { color: theme.text },
                              rtl && styles.rtlText,
                            ]}
                          />
                        </View>
                        <View style={styles.typingActions}>
                          <Pressable
                            style={styles.smallAction}
                            hitSlop={8}
                            onPress={() => setPhase({ kind: 'idle' })}
                          >
                            <MicIcon size={13} color={theme.textSecondary} />
                            <AppText secondary style={styles.smallActionText}>
                              {strings.rep.switchToVoice}
                            </AppText>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.submitPill,
                              {
                                backgroundColor: theme.action,
                                opacity: draft.trim() ? 1 : 0.5,
                              },
                            ]}
                            disabled={!draft.trim()}
                            onPress={() => void submitFollowUp(draft, 'typed')}
                          >
                            <AppText
                              style={[styles.submitText, { color: theme.actionText }]}
                            >
                              {strings.rep.submit}
                            </AppText>
                            <ArrowRightIcon size={13} color={theme.actionText} />
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.micColumn}>
                          <HoldToTalkButton
                            recording={phase.kind === 'recording'}
                            size={56}
                            onPressIn={onHoldStart}
                            onPressOut={() => void onHoldEnd()}
                          />
                          <AppText secondary style={styles.micHint}>
                            {phase.kind === 'recording'
                              ? strings.rep.releaseToFinish
                              : strings.feedback.answerFollowUp(
                                  result.followUp.xpBonus,
                                )}
                          </AppText>
                        </View>
                        {phase.kind === 'idle' && (
                          <Pressable
                            style={[styles.smallAction, styles.typeInstead]}
                            hitSlop={8}
                            onPress={() => setPhase({ kind: 'typing' })}
                          >
                            <KeyboardIcon size={13} color={theme.textDim} />
                            <AppText dim style={styles.smallActionText}>
                              {strings.rep.typeInstead}
                            </AppText>
                          </Pressable>
                        )}
                      </>
                    )}
                  </>
                )}
              </Card>
            </View>
          )}

          {/* XP / streak footer — plain View so Done is always tappable. */}
          <View>
            <Card style={styles.footerCard}>
              <View style={styles.footerStats}>
                <View style={styles.footerStat}>
                  <BoltIcon size={13} color={theme.xp} />
                  <MonoText weight="bold" color={theme.xp} style={styles.footerStatText}>
                    {strings.feedback.xp(result.xpEarned)}
                  </MonoText>
                </View>
                <View style={styles.footerStat}>
                  <FlameOutlineIcon size={13} color={theme.accent} />
                  <MonoText
                    weight="bold"
                    color={theme.accent}
                    style={styles.footerStatText}
                  >
                    {strings.feedback.day(result.streak.current)}
                  </MonoText>
                </View>
              </View>
              <Pressable style={styles.doneBtn} hitSlop={10} onPress={onDone}>
                <AppText secondary style={styles.doneText}>
                  {strings.feedback.done}
                </AppText>
                <ChevronRightIcon size={13} color={theme.textSecondary} />
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 22, paddingTop: 16, paddingBottom: 24, gap: 13 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1, minWidth: 0 },
  verdict: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.2,
  },

  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreCard: {
    width: 118,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  scoreWord: { fontSize: 11, fontWeight: '600' },
  coverageCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'center',
  },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coveredText: { flex: 1, fontSize: 12.5, fontWeight: '500' },
  missedText: { flex: 1, fontSize: 12.5, fontWeight: '500' },

  followUpCard: { padding: 16, gap: 10 },
  followUpKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  followUpQuestion: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  followUpFeedback: { fontSize: 13.5, lineHeight: 19.5 },
  followUpXp: { fontSize: 14 },
  errorText: { fontSize: 12, lineHeight: 17 },
  submittingBox: { paddingVertical: 8, alignItems: 'center' },
  micColumn: { alignItems: 'center', gap: 8, paddingTop: 2 },
  micHint: { fontSize: 12.5, fontWeight: '600' },
  typeInstead: { alignSelf: 'center' },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallActionText: { fontSize: 12, fontWeight: '600' },
  editorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 92,
  },
  editor: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
    padding: 0,
  },
  typingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  submitText: { fontSize: 13, fontWeight: '600' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },

  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footerStats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footerStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerStatText: { fontSize: 14 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontSize: 13, fontWeight: '600' },
});
