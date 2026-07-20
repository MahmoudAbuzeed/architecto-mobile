import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';

// The design vendors these five moods; student/reading exceeded the design
// project's export cap, so feedback reuses teacher until the user drops the
// originals into assets/lottie and extends this map.
const LOTTIES = {
  brain: require('@/assets/lottie/brain.json'),
  teacher: require('@/assets/lottie/teacher.json'),
  meditating: require('@/assets/lottie/meditating.json'),
  confetti: require('@/assets/lottie/confetti.json'),
  student: require('@/assets/lottie/teacher.json'), // fallback, see above
} as const;

export type ArchieMood = keyof typeof LOTTIES;

/**
 * Archie in his light disc — the 210px circle from the rep screens. `bob`
 * adds the idle float animation (asking state).
 */
export function ArchieCircle({
  mood,
  size = 210,
  bob = false,
}: {
  mood: ArchieMood;
  size?: number;
  bob?: boolean;
}) {
  const theme = useTheme();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (bob) {
      offset.value = withRepeat(
        withTiming(-5, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      offset.value = withTiming(0, { duration: 200 });
    }
  }, [bob, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.archieCircle,
          borderColor: theme.borderStrong,
        },
        animatedStyle,
      ]}
    >
      <LottieView
        source={LOTTIES[mood]}
        autoPlay
        loop
        style={{ width: size - 14, height: size - 14 }}
      />
    </Animated.View>
  );
}

/** Bare lottie (logo, mini bubbles) without the disc. */
export function ArchieLottie({
  mood,
  size,
}: {
  mood: ArchieMood;
  size: number;
}) {
  return (
    <LottieView
      source={LOTTIES[mood]}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
