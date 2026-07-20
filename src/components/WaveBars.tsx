import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

/**
 * The speech-wave bars from the rep screens: 7 subtle bars while Archie's TTS
 * plays; 9 orange bars while recording. Decorative loop — no amplitude
 * metering, exactly like the design.
 */
function Bar({
  active,
  height,
  color,
  delay,
  duration,
}: {
  active: boolean;
  height: number;
  color: string;
  delay: number;
  duration: number;
}) {
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (active) {
      scale.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        ),
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0.3, { duration: 150 });
    }
  }, [active, delay, duration, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { height, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function WaveBars({
  active,
  color,
  variant = 'speaking',
}: {
  active: boolean;
  color: string;
  variant?: 'speaking' | 'recording';
}) {
  const heights =
    variant === 'recording'
      ? [12, 24, 32, 20, 30, 16, 26, 14, 22]
      : [20, 20, 20, 20, 20, 20, 20];
  const duration = variant === 'recording' ? 700 : 1000;
  const step = variant === 'recording' ? 80 : 120;

  return (
    <View style={[styles.row, { height: Math.max(...heights) + 2 }]}>
      {heights.map((h, i) => (
        <Bar
          key={i}
          active={active}
          height={h}
          color={color}
          delay={i * step}
          duration={duration}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
