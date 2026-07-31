import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';

/**
 * A soft radial glow that breathes — placed behind Archie. Absolutely fills its
 * parent and centers the disc, so drop it in as the first child of a relatively
 * positioned wrapper. Breathing period is 2600ms (2x Archie's 1300ms bob, so
 * they re-sync each cycle). Static under reduced motion.
 */
export function GlowHalo({
  size = 200,
  color,
  breathe = true,
}: {
  size?: number;
  color?: string;
  breathe?: boolean;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const hue = color ?? theme.accent;
  const centerAlpha = theme.dark ? 0.35 : 0.16;

  const p = useSharedValue(reduced || !breathe ? 0.5 : 0);

  useEffect(() => {
    if (reduced || !breathe) return;
    p.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [p, reduced, breathe]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + p.value * 0.3, // 0.55 -> 0.85
    transform: [{ scale: 1 + p.value * 0.06 }], // 1 -> 1.06
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, animatedStyle]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="glow-halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={hue} stopOpacity={centerAlpha} />
            <Stop offset="0.7" stopColor={hue} stopOpacity={centerAlpha * 0.4} />
            <Stop offset="1" stopColor={hue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#glow-halo)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
