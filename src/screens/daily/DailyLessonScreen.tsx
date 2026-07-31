import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  useFocusEffect,
  useNavigation,
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
import { LessonMarkdown } from '@/components/LessonMarkdown';
import { HighlightableText } from '@/components/HighlightableText';
import { WaveBars } from '@/components/WaveBars';
import { QuipLoader } from '@/components/QuipLoader';
import { CloseIcon, CheckIcon, PlayIcon } from '@/components/icons';
import { useLessonSource } from '@/hooks/useLessonSource';
import { useTracksStore } from '@/store/tracks.store';
import { useSettingsStore } from '@/store/settings.store';
import { useTtsPlayback } from '@/hooks/useTtsPlayback';
import { ttsService } from '@/services/tts.service';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { GENERATING_QUIPS } from '@/lib/quips';
import { isArabic } from '@/lib/languages';
import { parseMarkdownBlocks } from '@/lib/markdown';
import {
  buildReadAlong,
  flattenBodyWords,
  activeWordIndex,
  bodyBlockRanges,
  splitWords,
} from '@/lib/readAlong';
import type { RootStackParamList } from '@/app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type AudioState = 'idle' | 'fetching' | 'ready' | 'failed';

/**
 * The daily 5-minute lesson: title, hook, spoken audio (optional), the
 * markdown body, key points, then the quiz CTA. Entered from Home or a
 * notification tap (no required params). Reading is dismissible.
 */
export function DailyLessonScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyLesson'>>();
  const topicSlug = params?.topicSlug;
  const review = params?.review ?? false;
  const { payload: daily, isLoading, error, fetch, isTopic } =
    useLessonSource(topicSlug);
  const contentLanguage = useSettingsStore((s) => s.contentLanguage);
  const trackLabel = useTracksStore(
    (s) => s.tracks?.tracks.find((t) => t.track === daily?.track)?.label,
  );
  const rtl = isArabic(contentLanguage);
  const reducedMotion = useReducedMotion();

  const tts = useTtsPlayback();
  const [audioState, setAudioState] = useState<AudioState>('idle');
  // Read-along state: `listening` turns on per-word rendering; `activeIndex` is
  // the currently-spoken word (global index over title + hook + body).
  const [listening, setListening] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const startedRef = useRef(false); // audio session started (playing or paused)

  // Auto-scroll follow: block Ys within the markdown, the markdown's Y in the
  // scroll content, and the viewport height.
  const scrollRef = useRef<ScrollView>(null);
  const blockYs = useRef<Record<number, number>>({});
  const markdownY = useRef(0);
  const viewportH = useRef(0);
  const lastScrolledBlock = useRef(-1);

  const lessonTitle = daily?.lesson?.title ?? '';
  const lessonHook = daily?.lesson?.hook ?? '';
  const lessonBody = daily?.lesson?.body ?? '';

  // Spoken-word model (title + hook + body), rebuilt per lesson.
  const readModel = useMemo(
    () =>
      buildReadAlong(
        lessonTitle,
        lessonHook,
        flattenBodyWords(parseMarkdownBlocks(lessonBody)),
      ),
    [lessonTitle, lessonHook, lessonBody],
  );
  const titleWordCount = useMemo(() => splitWords(lessonTitle).length, [lessonTitle]);
  const bodyRanges = useMemo(
    () => bodyBlockRanges(parseMarkdownBlocks(lessonBody), readModel.bodyStart),
    [lessonBody, readModel.bodyStart],
  );

  // Which body block holds the active word (-1 during the title/hook lead-in).
  const activeBlockIndex = useMemo(() => {
    if (activeIndex < readModel.bodyStart) return -1;
    return bodyRanges.findIndex(
      (r) => activeIndex >= r.startIndex && activeIndex < r.startIndex + r.count,
    );
  }, [activeIndex, bodyRanges, readModel.bodyStart]);

  // Ensure today's payload is present (cold notification entry).
  useEffect(() => {
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Stop audio + clear the read-along when the screen loses focus.
  useFocusEffect(
    useCallback(() => {
      return () => {
        void tts.stop();
        startedRef.current = false;
        setListening(false);
        setActiveIndex(-1);
      };
    }, [tts]),
  );

  // Follow the read with the scroll view — only when the active block changes.
  useEffect(() => {
    if (!listening || activeBlockIndex < 0) return;
    if (lastScrolledBlock.current === activeBlockIndex) return;
    lastScrolledBlock.current = activeBlockIndex;
    const by = blockYs.current[activeBlockIndex];
    if (by == null) return;
    const target = Math.max(0, markdownY.current + by - viewportH.current * 0.35);
    scrollRef.current?.scrollTo({ y: target, animated: !reducedMotion });
  }, [activeBlockIndex, listening, reducedMotion]);

  const onProgress = useCallback(
    (positionMs: number, durationMs: number) => {
      if (durationMs <= 0) return;
      const idx = activeWordIndex(readModel, positionMs / durationMs);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    },
    [readModel],
  );

  const onToggleAudio = useCallback(async () => {
    if (tts.isPlaying) {
      await tts.pause();
      return;
    }
    // Paused mid-track → resume where we left off (keeps the highlight).
    if (startedRef.current) {
      await tts.resume();
      return;
    }
    if (!daily?.topic) return;
    try {
      setAudioState('fetching');
      const path = isTopic
        ? `/learn/daily/lesson/${encodeURIComponent(daily.topic.slug)}/audio`
        : `/learn/daily/audio?track=${encodeURIComponent(daily.track)}`;
      const file = await ttsService.getOrFetch(
        path,
        contentLanguage,
        `${daily.topic.slug}|${daily.date}`,
      );
      setAudioState('ready');
      startedRef.current = true;
      lastScrolledBlock.current = -1;
      setListening(true);
      await tts.play(
        file,
        () => {
          startedRef.current = false;
          setListening(false);
          setActiveIndex(-1);
        },
        onProgress,
      );
    } catch {
      // Audio is enhancement — the lesson is on screen. Degrade silently.
      setAudioState('failed');
      startedRef.current = false;
      setListening(false);
    }
  }, [tts, daily, isTopic, contentLanguage, onProgress]);

  const kicker = trackLabel
    ? `${strings.daily.kicker} · ${trackLabel.toUpperCase()}`
    : strings.daily.kicker;

  const header = (right?: React.ReactNode) => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
        <CloseIcon size={18} color={theme.textSecondary} />
      </Pressable>
      <MonoText
        weight="medium"
        color={theme.textSecondary}
        numberOfLines={1}
        style={styles.headerLabel}
      >
        {kicker}
      </MonoText>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );

  // ── Loading (no payload yet) ─────────────────────────────────────────
  if (!daily && isLoading) {
    return (
      <Screen edges={['top', 'bottom']}>
        {header()}
        <View style={styles.center}>
          <QuipLoader pool={GENERATING_QUIPS} size={150} />
          <AppText dim style={styles.generating}>
            {strings.daily.generating}
          </AppText>
        </View>
      </Screen>
    );
  }

  // ── Error, no cached lesson ──────────────────────────────────────────
  if (!daily || (!daily.lesson && daily.status !== 'track_complete')) {
    return (
      <Screen edges={['top', 'bottom']}>
        {header()}
        <View style={styles.center}>
          <Card style={styles.errorCard}>
            <AppText style={styles.errorTitle}>{strings.daily.loadError}</AppText>
            {error ? (
              <AppText secondary style={styles.errorBody}>
                {error}
              </AppText>
            ) : null}
            <PrimaryButton
              height={44}
              label={strings.daily.retry}
              onPress={() => void fetch({ force: true })}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  // ── Track complete ───────────────────────────────────────────────────
  if (daily.status === 'track_complete') {
    return (
      <Screen edges={['top', 'bottom']}>
        {header()}
        <View style={styles.center}>
          <Card style={styles.errorCard}>
            <AppText style={styles.errorTitle}>
              {strings.daily.trackCompleteTitle}
            </AppText>
            <AppText secondary style={styles.errorBody}>
              {strings.daily.trackCompleteBody}
            </AppText>
            <PrimaryButton
              height={44}
              label={strings.daily.pickNewTrack}
              onPress={() =>
                navigation.navigate('TrackPicker', { context: 'switch' })
              }
            />
          </Card>
        </View>
      </Screen>
    );
  }

  const lesson = daily.lesson!;
  // Hide the quiz CTA when the lesson is already done OR opened as a read-only
  // review (a free user re-reading a completed topic — the quiz stays Pro).
  const completed = daily.status === 'completed' || review;
  const rightSlot = (
    <MonoText weight="medium" color={theme.textDim} style={styles.headerMeta}>
      {daily.streak.current > 0
        ? strings.daily.dayN(daily.streak.current)
        : strings.daily.fiveMin}
    </MonoText>
  );

  const accent = theme.accent;

  return (
    <Screen edges={['top', 'bottom']}>
      {header(rightSlot)}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => (viewportH.current = e.nativeEvent.layout.height)}
      >
        <HighlightableText
          text={lesson.title}
          startIndex={0}
          activeIndex={listening ? activeIndex : -1}
          accent={accent}
          style={[styles.title, rtl && styles.rtl]}
        />
        <HighlightableText
          text={lesson.hook}
          startIndex={titleWordCount}
          activeIndex={listening ? activeIndex : -1}
          accent={accent}
          style={[styles.hook, rtl && styles.rtl]}
        />

        {/* Read-along voice bar (daily dose + browsed topics). */}
        <Card style={styles.voiceCard}>
          <Pressable
            onPress={() => void onToggleAudio()}
            style={styles.voiceBtn}
            hitSlop={8}
          >
            {tts.isPlaying ? (
              <View style={[styles.pauseIcon, { borderColor: theme.text }]} />
            ) : (
              <PlayIcon size={15} color={theme.text} />
            )}
            <AppText style={styles.voiceLabel}>
              {tts.isPlaying ? strings.daily.pause : strings.daily.listen}
            </AppText>
          </Pressable>
          <WaveBars active={tts.isPlaying} color={theme.action} />
          {audioState === 'fetching' && !tts.isPlaying ? (
            <AppText dim style={styles.audioHint}>
              …
            </AppText>
          ) : null}
        </Card>

        {completed ? (
          <Card style={styles.doneBanner}>
            <AppText secondary style={styles.doneText}>
              {daily.attempt
                ? strings.daily.reviewBanner(
                    daily.attempt.score,
                    daily.attempt.total,
                  )
                : strings.home.lessonDoneTitle}
            </AppText>
          </Card>
        ) : null}

        <View onLayout={(e) => (markdownY.current = e.nativeEvent.layout.y)}>
          <LessonMarkdown
            body={lesson.body}
            rtl={rtl}
            readAlong={listening}
            activeWordIndex={listening ? activeIndex : -1}
            bodyWordStart={readModel.bodyStart}
            accent={accent}
            onBlockLayout={(i, y) => {
              blockYs.current[i] = y;
            }}
          />
        </View>

        {/* Key points */}
        {lesson.keyPoints.length > 0 && (
          <Card style={styles.keyPointsCard}>
            <MonoText
              weight="semiBold"
              color={theme.textSecondary}
              style={styles.keyKicker}
            >
              {strings.daily.keyPoints}
            </MonoText>
            {lesson.keyPoints.map((kp, i) => (
              <View key={i} style={[styles.kpRow, rtl && styles.kpRowRtl]}>
                <CheckIcon size={13} color={theme.emerald} />
                <AppText style={[styles.kpText, rtl && styles.rtl]}>{kp}</AppText>
              </View>
            ))}
          </Card>
        )}

        {!completed && (
          <PrimaryButton
            label={strings.daily.takeQuiz}
            onPress={() =>
              navigation.navigate(
                'DailyQuiz',
                topicSlug ? { topicSlug } : undefined,
              )
            }
            style={styles.cta}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLabel: { fontSize: 11, letterSpacing: 1.1, flex: 1, textAlign: 'center' },
  headerRight: { minWidth: 54, alignItems: 'flex-end' },
  headerMeta: { fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
  generating: { fontSize: 12.5, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  errorCard: { alignSelf: 'stretch', padding: 18, gap: 12 },
  errorTitle: { fontSize: 17, fontWeight: '700' },
  errorBody: { fontSize: 13, lineHeight: 19 },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, lineHeight: 30 },
  hook: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceLabel: { fontSize: 14, fontWeight: '600' },
  pauseIcon: {
    width: 13,
    height: 13,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000',
  },
  audioHint: { fontSize: 16 },
  doneBanner: { padding: 12 },
  doneText: { fontSize: 13, lineHeight: 19 },
  keyPointsCard: { padding: 16, gap: 10, marginTop: 4 },
  keyKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  kpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  kpRowRtl: { flexDirection: 'row-reverse' },
  kpText: { flex: 1, fontSize: 14, lineHeight: 20 },
  cta: { marginTop: 8 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
});
