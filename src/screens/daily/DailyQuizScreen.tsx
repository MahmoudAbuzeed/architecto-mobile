import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Card,
  MonoText,
  PrimaryButton,
  Screen,
} from '@/components/Primitives';
import { QuipLoader } from '@/components/QuipLoader';
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  MissedIcon,
} from '@/components/icons';
import { ProgressBar } from '@/components/ProgressBar';
import { ReminderPrimeCard } from '@/components/ReminderPrimeCard';
import { useLessonSource } from '@/hooks/useLessonSource';
import { useSettingsStore } from '@/store/settings.store';
import { showDialog } from '@/store/ui.store';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { GENERATING_QUIPS } from '@/lib/quips';
import { isArabic } from '@/lib/languages';
import type { DailySubmitResponse } from '@/types';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Phase =
  | { kind: 'answering'; index: number }
  | { kind: 'submitting' }
  | { kind: 'results'; res: DailySubmitResponse };

/**
 * One MCQ at a time, then a results view with per-question explanations, XP,
 * track progress, and a first-run reminder prime. Answers live in local state
 * (ephemeral); the graded result is owned by daily.store.submit.
 */
export function DailyQuizScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyQuiz'>>();
  const topicSlug = params?.topicSlug;
  const { payload: daily, submit } = useLessonSource(topicSlug);
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const rtl = isArabic(contentLanguage);

  const questions = useMemo(() => daily?.questions ?? [], [daily]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>({ kind: 'answering', index: 0 });
  const [error, setError] = useState<string | null>(null);

  const hasAnswers = Object.keys(answers).length > 0;

  // Guard leaving mid-quiz (before results), matching the rep flow.
  usePreventRemove(phase.kind === 'answering' && hasAnswers, ({ data }) => {
    showDialog({
      title: strings.daily.leaveQuizTitle,
      message: strings.daily.leaveQuizBody,
      buttons: [
        { text: strings.daily.leaveQuizStay, style: 'cancel' },
        {
          text: strings.daily.leaveQuizLeave,
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    });
  });

  const doSubmit = useCallback(async () => {
    setPhase({ kind: 'submitting' });
    setError(null);
    try {
      const res = await submit(answers);
      setPhase({ kind: 'results', res });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
      setPhase({ kind: 'answering', index: questions.length - 1 });
    }
  }, [answers, submit, questions.length]);

  if (questions.length === 0) {
    // Shouldn't happen (lesson gates the CTA), but fail safe.
    return (
      <Screen edges={['top', 'bottom']} style={styles.center}>
        <AppText secondary>{strings.daily.loadError}</AppText>
        <PrimaryButton
          label={strings.daily.done}
          onPress={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  // ── Submitting ───────────────────────────────────────────────────────
  if (phase.kind === 'submitting') {
    return (
      <Screen edges={['top', 'bottom']} style={styles.center}>
        <QuipLoader pool={GENERATING_QUIPS} />
      </Screen>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────
  if (phase.kind === 'results') {
    const { res } = phase;
    const resultById = new Map(res.results.map((r) => [r.id, r]));
    const fraction =
      res.trackProgress.topicsTotal > 0
        ? res.trackProgress.topicsCompleted / res.trackProgress.topicsTotal
        : 0;
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <MonoText weight="medium" color={theme.textSecondary} style={styles.headerLabel}>
            {strings.daily.kicker}
          </MonoText>
          <View style={styles.headerSide} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreRow}>
            <MonoText weight="bold" color={theme.accent} style={styles.scoreBig}>
              {strings.daily.resultsScore(res.score, res.total)}
            </MonoText>
            <View style={[styles.xpChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <BoltIcon size={13} color={theme.accent} />
              <MonoText weight="semiBold" color={theme.text} style={styles.xpChipText}>
                {strings.daily.xpEarned(res.xpEarned)}
              </MonoText>
            </View>
          </View>

          {/* Per-question review */}
          {questions.map((q, qi) => {
            const r = resultById.get(q.id);
            const chosen = answers[q.id];
            return (
              <Card key={q.id} style={styles.reviewCard}>
                <AppText style={[styles.reviewQ, rtl && styles.rtl]}>
                  {qi + 1}. {q.question}
                </AppText>
                <View style={[styles.reviewRow, rtl && styles.rowRtl]}>
                  {r?.correct ? (
                    <CheckIcon size={13} color={theme.emerald} />
                  ) : (
                    <MissedIcon size={13} />
                  )}
                  <AppText secondary style={[styles.reviewText, rtl && styles.rtl]}>
                    {chosen !== undefined ? q.options[chosen] : '—'}
                  </AppText>
                </View>
                {r && !r.correct && (
                  <View style={[styles.reviewRow, rtl && styles.rowRtl]}>
                    <CheckIcon size={13} color={theme.emerald} />
                    <AppText style={[styles.reviewText, rtl && styles.rtl]}>
                      {q.options[r.correctIndex]}
                    </AppText>
                  </View>
                )}
                {r?.explanation ? (
                  <AppText dim style={[styles.explanation, rtl && styles.rtl]}>
                    {r.explanation}
                  </AppText>
                ) : null}
              </Card>
            );
          })}

          {/* Track progress */}
          <View style={styles.progressBlock}>
            <View style={styles.progressBar}>
              <ProgressBar fraction={fraction} color={theme.accent} height={6} />
            </View>
            <MonoText weight="medium" color={theme.textSecondary} style={styles.progressText}>
              {strings.home.topicsProgress(
                res.trackProgress.topicsCompleted,
                res.trackProgress.topicsTotal,
              )}
            </MonoText>
          </View>
          {res.nextTopic ? (
            <AppText secondary style={styles.teaser}>
              {strings.daily.tomorrowTeaser(res.nextTopic.title)}
            </AppText>
          ) : null}

          {/* First-run reminder prime */}
          <ReminderPrimeCard />

          <PrimaryButton
            label={strings.daily.done}
            style={styles.cta}
            onPress={() => {
              if (res.streak.extended) {
                navigation.replace('Celebration', {
                  streak: res.streak.current,
                  isNewRecord: res.streak.current >= res.streak.longest,
                  xpToday: res.xpEarned,
                });
              } else {
                // Pop the whole daily flow (lesson + quiz) back to the tabs.
                navigation.popToTop();
              }
            }}
          />
        </ScrollView>
      </Screen>
    );
  }

  // ── Answering ────────────────────────────────────────────────────────
  const index = phase.index;
  const q = questions[index];
  const isLast = index === questions.length - 1;
  const selected = answers[q.id];
  const canAdvance = selected !== undefined;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            index > 0
              ? setPhase({ kind: 'answering', index: index - 1 })
              : navigation.goBack()
          }
          hitSlop={12}
          style={styles.headerSide}
        >
          {index > 0 ? (
            <ChevronLeftIcon size={18} color={theme.textSecondary} />
          ) : (
            <CloseIcon size={18} color={theme.textSecondary} />
          )}
        </Pressable>
        <MonoText weight="medium" color={theme.textSecondary} style={styles.headerLabel}>
          {strings.daily.quizProgress(index + 1, questions.length)}
        </MonoText>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Card style={styles.errBanner}>
            <AppText secondary style={styles.errText}>
              {error}
            </AppText>
          </Card>
        ) : null}

        <AppText style={[styles.question, rtl && styles.rtl]}>{q.question}</AppText>

        {q.options.map((opt, oi) => {
          const active = selected === oi;
          return (
            <Pressable
              key={oi}
              onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: theme.card,
                  borderColor: active ? theme.accent : theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
                active && { borderWidth: 2 },
              ]}
            >
              <AppText style={[styles.optionText, rtl && styles.rtl]}>{opt}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          disabled={!canAdvance}
          icon={
            !isLast ? <ArrowRightIcon size={14} color={theme.actionText} /> : undefined
          }
          label={isLast ? strings.daily.submitQuiz : strings.daily.next}
          onPress={() => {
            if (isLast) {
              void doSubmit();
            } else {
              setPhase({ kind: 'answering', index: index + 1 });
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerSide: { minWidth: 40 },
  headerLabel: { fontSize: 11, letterSpacing: 1.1, flex: 1, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 24, gap: 12 },
  question: { fontSize: 19, fontWeight: '700', lineHeight: 26, marginBottom: 4 },
  option: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  optionText: { fontSize: 15, lineHeight: 21 },
  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 6 },
  errBanner: { padding: 12 },
  errText: { fontSize: 12.5, lineHeight: 18 },
  // results
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBig: { fontSize: 40 },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  xpChipText: { fontSize: 13 },
  reviewCard: { padding: 14, gap: 8 },
  reviewQ: { fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  reviewText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  explanation: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  progressBar: { flex: 1, minWidth: 0 },
  progressText: { fontSize: 11 },
  teaser: { fontSize: 13, lineHeight: 19 },
  cta: { marginTop: 10 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
});
