import React, { useMemo } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { mono } from '@/theme/typography';
import { parseMarkdownBlocks, type MdBlock, type MdSpan } from '@/lib/markdown';
import { bodyBlockRanges, type BlockWordRange } from '@/lib/readAlong';

/**
 * Renders the daily-lesson body from its markdown using the in-house block
 * parser (src/lib/markdown). The backend body is constrained to headings,
 * paragraphs, bullets, numbered items, bold and inline code — no tables/links —
 * so this stays small and on-theme (no external markdown dependency).
 *
 * In READ-ALONG mode (`activeWordIndex >= 0`), each word is its own <Text> so
 * the spoken word can be tinted. Blocks are memoized on their local active
 * index, so only the entering/leaving block re-renders per tick. `onBlockLayout`
 * reports each block's Y (within this component) for auto-scroll follow.
 */
export function LessonMarkdown({
  body,
  blocks: blocksProp,
  rtl,
  readAlong,
  activeWordIndex = -1,
  bodyWordStart = 0,
  accent,
  onBlockLayout,
}: {
  /** Raw markdown. Ignored when `blocks` is supplied. */
  body?: string;
  /** Pre-parsed blocks (a single section card passes its own slice). */
  blocks?: MdBlock[];
  rtl?: boolean;
  /** Turn on per-word rendering (only while listening — it's heavier). */
  readAlong?: boolean;
  /** Global index of the word to highlight (-1 = none). */
  activeWordIndex?: number;
  /** Global index of the first rendered word (after title + hook, or the
   *  card's own offset when a section slice is passed). */
  bodyWordStart?: number;
  accent?: string;
  onBlockLayout?: (blockIndex: number, y: number) => void;
}) {
  const theme = useTheme();
  const blocks = useMemo(
    () => blocksProp ?? parseMarkdownBlocks(body ?? ''),
    [blocksProp, body],
  );
  const ranges = useMemo(
    () => (readAlong ? bodyBlockRanges(blocks, bodyWordStart) : []),
    [blocks, readAlong, bodyWordStart],
  );
  const rtlStyle = rtl ? styles.rtl : null;

  // ── Read-along path: per-word <Text>, memoized blocks, layout reporting ──
  if (readAlong) {
    return (
      <View style={styles.container}>
        {blocks.map((block, i) => {
          const range = ranges[i];
          const localActive =
            activeWordIndex >= range.startIndex &&
            activeWordIndex < range.startIndex + range.count
              ? activeWordIndex - range.startIndex
              : -1;
          return (
            <ReadAlongBlock
              key={i}
              blockIndex={i}
              block={block}
              range={range}
              localActive={localActive}
              accent={accent ?? theme.accent}
              textColor={theme.text}
              codeBg={theme.card}
              rtl={!!rtl}
              onBlockLayout={onBlockLayout}
            />
          );
        })}
      </View>
    );
  }

  // ── Plain path (unchanged) ──────────────────────────────────────────────
  const renderSpans = (spans: MdSpan[]) =>
    spans.map((s, i) => {
      if (s.code) {
        return (
          <Text
            key={i}
            style={[styles.code, { color: theme.text, backgroundColor: theme.card }]}
          >
            {s.text}
          </Text>
        );
      }
      if (s.bold) {
        return (
          <Text key={i} style={styles.bold}>
            {s.text}
          </Text>
        );
      }
      return <Text key={i}>{s.text}</Text>;
    });

  return (
    <View style={styles.container}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Text
                key={i}
                style={[
                  styles.heading,
                  block.level >= 3 && styles.headingSmall,
                  { color: theme.text },
                  rtlStyle,
                ]}
              >
                {renderSpans(block.spans)}
              </Text>
            );
          case 'bullet':
            return (
              <View key={i} style={[styles.listRow, rtl && styles.listRowRtl]}>
                <Text style={[styles.bulletDot, { color: theme.accent }]}>•</Text>
                <Text style={[styles.body, { color: theme.text }, rtlStyle]}>
                  {renderSpans(block.spans)}
                </Text>
              </View>
            );
          case 'numbered':
            return (
              <View key={i} style={[styles.listRow, rtl && styles.listRowRtl]}>
                <Text style={[styles.ordinal, { color: theme.accent }]}>
                  {block.ordinal}.
                </Text>
                <Text style={[styles.body, { color: theme.text }, rtlStyle]}>
                  {renderSpans(block.spans)}
                </Text>
              </View>
            );
          default:
            return (
              <Text key={i} style={[styles.body, { color: theme.text }, rtlStyle]}>
                {renderSpans(block.spans)}
              </Text>
            );
        }
      })}
    </View>
  );
}

/**
 * A single read-along block. Memoized so only the block whose `localActive`
 * changed (the word entering/leaving) re-renders on each playback tick.
 */
const ReadAlongBlock = React.memo(function ReadAlongBlockInner({
  blockIndex,
  block,
  range,
  localActive,
  accent,
  textColor,
  codeBg,
  rtl,
  onBlockLayout,
}: {
  blockIndex: number;
  block: MdBlock;
  range: BlockWordRange;
  localActive: number;
  accent: string;
  textColor: string;
  codeBg: string;
  rtl: boolean;
  onBlockLayout?: (blockIndex: number, y: number) => void;
}) {
  const rtlStyle = rtl ? styles.rtl : null;
  const onLayout = onBlockLayout
    ? (e: LayoutChangeEvent) => onBlockLayout(blockIndex, e.nativeEvent.layout.y)
    : undefined;

  // Render each span's words as its own <Text>, tinting the active one. A
  // running local index tracks position across spans within the block.
  let li = 0;
  const words: React.ReactNode[] = [];
  block.spans.forEach((span, si) => {
    const spanStyle = span.code
      ? [styles.code, { color: textColor, backgroundColor: codeBg }]
      : span.bold
        ? styles.bold
        : undefined;
    range.spanWords[si].forEach((w, wi) => {
      const active = li === localActive;
      words.push(
        <Text
          key={`${si}-${wi}`}
          style={[spanStyle, active && { backgroundColor: `${accent}59` }]}
        >
          {w}{' '}
        </Text>,
      );
      li += 1;
    });
  });

  switch (block.kind) {
    case 'heading':
      return (
        <Text
          onLayout={onLayout}
          style={[
            styles.heading,
            block.level >= 3 && styles.headingSmall,
            { color: textColor },
            rtlStyle,
          ]}
        >
          {words}
        </Text>
      );
    case 'bullet':
      return (
        <View onLayout={onLayout} style={[styles.listRow, rtl && styles.listRowRtl]}>
          <Text style={[styles.bulletDot, { color: accent }]}>•</Text>
          <Text style={[styles.body, { color: textColor }, rtlStyle]}>{words}</Text>
        </View>
      );
    case 'numbered':
      return (
        <View onLayout={onLayout} style={[styles.listRow, rtl && styles.listRowRtl]}>
          <Text style={[styles.ordinal, { color: accent }]}>{block.ordinal}.</Text>
          <Text style={[styles.body, { color: textColor }, rtlStyle]}>{words}</Text>
        </View>
      );
    default:
      return (
        <Text onLayout={onLayout} style={[styles.body, { color: textColor }, rtlStyle]}>
          {words}
        </Text>
      );
  }
});

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 4,
  },
  headingSmall: { fontSize: 15 },
  body: { flex: 1, fontSize: 15, lineHeight: 24 },
  bold: { fontWeight: '700' },
  code: {
    fontFamily: mono.medium,
    fontSize: 13,
    borderRadius: 4,
  },
  listRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  listRowRtl: { flexDirection: 'row-reverse' },
  bulletDot: { fontSize: 15, lineHeight: 24, fontWeight: '700' },
  ordinal: { fontSize: 14, lineHeight: 24, fontWeight: '700', minWidth: 18 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
});
