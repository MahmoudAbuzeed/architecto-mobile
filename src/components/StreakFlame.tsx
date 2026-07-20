import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FlameIcon } from './icons';

/**
 * The streak flame with the design's "flick" wobble (rotate ±, origin at the
 * flame base). Used on the Home streak card and the celebration screen.
 */
export function StreakFlame({ size = 56 }: { size?: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [t]);

  const style = useAnimatedStyle(() => {
    const angle = -4 + t.value * 8;
    const scale = 1 + t.value * 0.07;
    return {
      transform: [
        // Approximate transform-origin 50% 80%: shift, rotate, shift back.
        { translateY: size * 0.3 },
        { rotate: `${angle}deg` },
        { scale },
        { translateY: -size * 0.3 },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <FlameIcon size={size} />
    </Animated.View>
  );
}
