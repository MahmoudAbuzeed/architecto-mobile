import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';
import {
  AppText,
  Card,
  GhostButton,
  MonoText,
  PrimaryButton,
} from './Primitives';
import { HighlightableText } from './HighlightableText';
import { LessonMarkdown } from './LessonMarkdown';
import { WaveBars } from './WaveBars';
import { PlayIcon, CheckIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { haptic } from '@/lib/haptics';
import { bodyBlockRanges } from '@/lib/readAlong';
import { cardForWord, type LessonSection } from '@/lib/lessonCards';

const SWIPE = 45; // px of horizontal travel that commits a card change

/**
 * Paged "story card" reading experience for the daily lesson. Instead of one
 * long scroll, the lesson is broken into a cover, one card per section, and a
 * recap — swipe or tap Continue to advance, with a segmented progress bar.
 *
 * When the read-along audio is playing, the pager AUTO-ADVANCES: `audioCard`
 * (derived from the currently-spoken word) pulls the deck forward in sync with
 * the narration. Manually swiping disengages that follow until the narration
 * catches back up to the card you're on — so you can read ahead without being
 * yanked around, then rejoin the voice.
 */
export function LessonCards({
  title,
  hook,
  meta,
  sections,
  keyPoints,
  rtl,
  accent,
  listening,
  activeIndex,
  titleWordCount,
  bodyStart,
  isPlaying,
  audioBusy,
  audioError,
  onToggleAudio,
  completed,
  doneText,
  onTakeQuiz,
  onClose,
  reducedMotion,
}: {
  title: string;
  hook: string;
  /** Small mono meta line on the cover (~5 MIN / DAY N). */
  meta: string;
  sections: LessonSection[];
  keyPoints: string[];
  rtl: boolean;
  accent: string;
  listening: boolean;
  activeIndex: number;
  titleWordCount: number;
  bodyStart: number;
  isPlaying: boolean;
  audioBusy: boolean;
  /** Reason the voice couldn't play (null = fine). Shown, never blocks reading. */
  audioError?: string | null;
  onToggleAudio: () => void;
  completed: boolean;
  doneText?: string;
  onTakeQuiz: () => void;
  onClose: () => void;
  reducedMotion: boolean;
}) {
  const theme = useTheme();

  // cover (0) + one per section + recap
  const total = sections.length + 2;
  const recapIndex = total - 1;

  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const currentRef = useRef(0);
  const following = useRef(true); // auto-advance tracks the audio

  const goTo = useCallback(
    (idx: number, direction: 'next' | 'prev', fromAudio = false) => {
      const clamped = Math.max(0, Math.min(total - 1, idx));
      if (clamped === currentRef.current) return;
      if (!fromAudio) {
        following.current = false; // manual nav takes over from the voice
        haptic('selection');
      }
      setDir(direction);
      setCurrent(clamped);
      currentRef.current = clamped;
    },
    [total],
  );

  const goNext = useCallback(
    () => goTo(currentRef.current + 1, 'next'),
    [goTo],
  );
  const goPrev = useCallback(
    () => goTo(currentRef.current - 1, 'prev'),
    [goTo],
  );

  // ── Audio auto-advance ────────────────────────────────────────────────
  const audioCard = useMemo(
    () => (listening ? cardForWord(activeIndex, bodyStart, sections) : -1),
    [listening, activeIndex, bodyStart, sections],
  );
  useEffect(() => {
    if (audioCard < 0) return;
    // Re-engage the follow once the voice reaches the card you're on.
    if (audioCard === currentRef.current) {
      following.current = true;
      return;
    }
    if (following.current) {
      goTo(audioCard, audioCard > currentRef.current ? 'next' : 'prev', true);
    }
  }, [audioCard, goTo]);

  // ── Swipe (built-in PanResponder — no gesture-handler dep) ─────────────
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderRelease: (_evt, g) => {
        const forward = rtl ? g.dx >= SWIPE : g.dx <= -SWIPE;
        const backward = rtl ? g.dx <= -SWIPE : g.dx >= SWIPE;
        if (forward) goNext();
        else if (backward) goPrev();
      },
    }),
  ).current;

  const entering = useMemo(() => {
    if (reducedMotion) return FadeIn.duration(140);
    const fromRight = dir === 'next' ? !rtl : rtl;
    return (fromRight ? SlideInRight : SlideInLeft).duration(240);
  }, [dir, rtl, reducedMotion]);

  // ── Card body ─────────────────────────────────────────────────────────
  const renderCard = () => {
    if (current === 0) {
      return (
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
            {meta}
          </MonoText>
          <HighlightableText
            text={title}
            startIndex={0}
            activeIndex={listening ? activeIndex : -1}
            accent={accent}
            style={[styles.title, { color: theme.text }, rtl && styles.rtl]}
          />
          <HighlightableText
            text={hook}
            startIndex={titleWordCount}
            activeIndex={listening ? activeIndex : -1}
            accent={accent}
            style={[styles.hook, { color: theme.text }, rtl && styles.rtl]}
          />
          <Card style={styles.voiceCard}>
            <Pressable
              onPress={onToggleAudio}
              style={styles.voiceBtn}
              hitSlop={8}
            >
              {isPlaying ? (
                <View style={[styles.pauseIcon, { borderColor: theme.text }]} />
              ) : (
                <PlayIcon size={15} color={theme.text} />
              )}
              <AppText style={styles.voiceLabel}>
                {isPlaying ? strings.daily.pause : strings.daily.listen}
              </AppText>
            </Pressable>
            <WaveBars active={isPlaying} color={theme.action} />
            {audioBusy && !isPlaying ? (
              <AppText dim style={styles.audioHint}>
                …
              </AppText>
            ) : null}
          </Card>
          <AppText dim style={[styles.swipeHint, rtl && styles.rtl]}>
            {strings.daily.swipeHint}
          </AppText>
        </ScrollView>
      );
    }

    if (current === recapIndex) {
      return (
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          {completed && doneText ? (
            <Card style={styles.doneBanner}>
              <AppText secondary style={styles.doneText}>
                {doneText}
              </AppText>
            </Card>
          ) : null}
          {keyPoints.length > 0 ? (
            <Card style={styles.keyPointsCard}>
              <MonoText
                weight="semiBold"
                color={theme.textSecondary}
                style={styles.keyKicker}
              >
                {strings.daily.keyPoints}
              </MonoText>
              {keyPoints.map((kp, i) => (
                <View key={i} style={[styles.kpRow, rtl && styles.kpRowRtl]}>
                  <CheckIcon size={13} color={theme.emerald} />
                  <AppText style={[styles.kpText, rtl && styles.rtl]}>
                    {kp}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      );
    }

    return (
      <SectionCard
        section={sections[current - 1]}
        rtl={rtl}
        accent={accent}
        listening={listening}
        activeIndex={activeIndex}
        reducedMotion={reducedMotion}
      />
    );
  };

  // ── Footer primary action ─────────────────────────────────────────────
  const footerPrimary =
    current < recapIndex
      ? { label: strings.daily.continueLabel, onPress: goNext }
      : completed
        ? { label: strings.daily.done, onPress: onClose }
        : { label: strings.daily.takeQuiz, onPress: onTakeQuiz };

  return (
    <View style={styles.root}>
      {/* Segmented progress */}
      <View style={[styles.progress, rtl && styles.progressRtl]}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i <= current ? accent : theme.borderStrong,
              },
            ]}
          />
        ))}
      </View>

      {audioError ? (
        <View style={styles.audioErr}>
          <AppText style={[styles.audioErrText, { color: theme.textSecondary }]}>
            {audioError}
          </AppText>
        </View>
      ) : null}

      {/* Swipeable card area */}
      <View style={styles.cardArea} {...pan.panHandlers}>
        <Animated.View key={current} entering={entering} style={styles.cardWrap}>
          {renderCard()}
        </Animated.View>
      </View>

      {/* Footer nav */}
      <View style={[styles.footer, rtl && styles.footerRtl]}>
        {current > 0 ? (
          <GhostButton
            label={strings.daily.back}
            onPress={goPrev}
            height={48}
            style={styles.backBtn}
          />
        ) : null}
        <PrimaryButton
          label={footerPrimary.label}
          onPress={footerPrimary.onPress}
          height={48}
          style={styles.primary}
        />
      </View>
    </View>
  );
}

/**
 * One section card. Owns its own scroll view so long sections scroll
 * vertically, and — while listening — follows the spoken word by scrolling the
 * active block toward the top.
 */
function SectionCard({
  section,
  rtl,
  accent,
  listening,
  activeIndex,
  reducedMotion,
}: {
  section: LessonSection;
  rtl: boolean;
  accent: string;
  listening: boolean;
  activeIndex: number;
  reducedMotion: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const blockYs = useRef<Record<number, number>>({});
  const lastBlock = useRef(-1);

  const ranges = useMemo(
    () => bodyBlockRanges(section.blocks, section.wordStart),
    [section],
  );
  const activeLocalBlock = useMemo(() => {
    if (!listening || activeIndex < section.wordStart) return -1;
    return ranges.findIndex(
      (r) => activeIndex >= r.startIndex && activeIndex < r.startIndex + r.count,
    );
  }, [listening, activeIndex, ranges, section.wordStart]);

  useEffect(() => {
    if (activeLocalBlock < 0) return;
    if (lastBlock.current === activeLocalBlock) return;
    lastBlock.current = activeLocalBlock;
    const y = blockYs.current[activeLocalBlock];
    if (y == null) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - 60),
      animated: !reducedMotion,
    });
  }, [activeLocalBlock, reducedMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.pad}
      showsVerticalScrollIndicator={false}
    >
      <LessonMarkdown
        blocks={section.blocks}
        rtl={rtl}
        readAlong={listening}
        activeWordIndex={listening ? activeIndex : -1}
        bodyWordStart={section.wordStart}
        accent={accent}
        onBlockLayout={(i, y) => {
          blockYs.current[i] = y;
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progress: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  progressRtl: { flexDirection: 'row-reverse' },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  audioErr: { paddingHorizontal: 20, paddingBottom: 8 },
  audioErrText: { fontSize: 12.5, lineHeight: 17 },
  cardArea: { flex: 1 },
  cardWrap: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 14 },
  meta: { fontSize: 11, letterSpacing: 1, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3, lineHeight: 32 },
  hook: { fontSize: 15.5, lineHeight: 23, fontStyle: 'italic' },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginTop: 4,
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
  swipeHint: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  doneBanner: { padding: 12 },
  doneText: { fontSize: 13, lineHeight: 19 },
  keyPointsCard: { padding: 16, gap: 10 },
  keyKicker: { fontSize: 10.5, letterSpacing: 1.5 },
  kpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  kpRowRtl: { flexDirection: 'row-reverse' },
  kpText: { flex: 1, fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  footerRtl: { flexDirection: 'row-reverse' },
  backBtn: { paddingHorizontal: 20 },
  primary: { flex: 1 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
});
