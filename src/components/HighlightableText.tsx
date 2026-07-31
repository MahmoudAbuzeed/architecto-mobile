import React, { useMemo } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { splitWords } from '@/lib/readAlong';

/**
 * Renders `text` as per-word <Text> so read-along can tint the spoken word.
 * `startIndex` is this text's first word's GLOBAL index; the word whose global
 * index === activeIndex gets the highlight. Used for the lesson title + hook
 * (the body goes through LessonMarkdown's read-along mode). When activeIndex is
 * out of range nothing highlights, so it reads identically to plain text.
 */
export function HighlightableText({
  text,
  startIndex,
  activeIndex,
  accent,
  style,
  numberOfLines,
}: {
  text: string;
  startIndex: number;
  activeIndex: number;
  accent: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const words = useMemo(() => splitWords(text), [text]);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {words.map((w, i) => {
        const active = startIndex + i === activeIndex;
        return (
          <Text
            key={i}
            style={active ? { backgroundColor: `${accent}59` } : undefined}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </Text>
        );
      })}
    </Text>
  );
}
