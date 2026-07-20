import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';

function Caret() {
  const theme = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0, { duration: 500 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[styles.caret, { backgroundColor: theme.accent }, style]}
    />
  );
}

/**
 * Live transcript (design 1e): large text where older words fade — the last
 * ~8 words are brightest, earlier ones progressively dimmer — with a blinking
 * orange caret at the end.
 */
export function TranscriptView({
  transcript,
  rtl = false,
}: {
  transcript: string;
  rtl?: boolean;
}) {
  const theme = useTheme();
  const words = transcript.split(/\s+/).filter(Boolean);

  const tierColor = (index: number): string => {
    const fromEnd = words.length - 1 - index;
    if (fromEnd < 8) return theme.text;
    if (fromEnd < 20) return theme.textSecondary;
    return theme.textDim;
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      // Keep the newest words in view as the transcript grows.
      ref={(ref) => ref?.scrollToEnd({ animated: true })}
    >
      <Text
        style={[
          styles.text,
          rtl && styles.rtl,
        ]}
      >
        {words.map((w, i) => (
          <Text key={`${i}-${w}`} style={{ color: tierColor(i) }}>
            {w}{' '}
          </Text>
        ))}
        <Caret />
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 18 },
  text: { fontSize: 21, lineHeight: 36 },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  caret: {
    width: 2,
    height: 20,
    marginLeft: 3,
    marginBottom: -3,
  },
});
