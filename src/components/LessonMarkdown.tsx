import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { mono } from '@/theme/typography';
import { parseMarkdownBlocks, type MdSpan } from '@/lib/markdown';

/**
 * Renders the daily-lesson body from its markdown using the in-house block
 * parser (src/lib/markdown). The backend body is constrained to headings,
 * paragraphs, bullets, numbered items, bold and inline code — no tables/links —
 * so this stays small and on-theme (no external markdown dependency).
 */
export function LessonMarkdown({
  body,
  rtl,
}: {
  body: string;
  rtl?: boolean;
}) {
  const theme = useTheme();
  const blocks = useMemo(() => parseMarkdownBlocks(body), [body]);
  const rtlStyle = rtl ? styles.rtl : null;

  const renderSpans = (spans: MdSpan[]) =>
    spans.map((s, i) => {
      if (s.code) {
        return (
          <Text
            key={i}
            style={[
              styles.code,
              { color: theme.text, backgroundColor: theme.card },
            ]}
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
              <Text
                key={i}
                style={[styles.body, { color: theme.text }, rtlStyle]}
              >
                {renderSpans(block.spans)}
              </Text>
            );
        }
      })}
    </View>
  );
}

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
