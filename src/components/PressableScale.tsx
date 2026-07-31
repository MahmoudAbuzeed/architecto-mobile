import React, { PropsWithChildren, useCallback, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press-in is quick and critically damped (no bounce); release settles with one
// soft overshoot — the "magnetic" feel. Applied to the Pressable itself (not an
// ancestor) so Fabric hit-testing stays honest.
const PRESS_IN = { damping: 24, stiffness: 380 };
const PRESS_OUT = { damping: 14, stiffness: 220 };

type StyleFn = (state: { pressed: boolean }) => StyleProp<ViewStyle>;

/**
 * Pressable that springs to 0.97 on press and back on release, with an optional
 * light haptic. `style` accepts a plain style or the Pressable `({ pressed })`
 * function form. The style is resolved to a plain array (not passed as a
 * function) because an animated Pressable does not reliably honor Pressable's
 * function-style API — the `pressed` state is tracked here instead.
 */
export function PressableScale({
  children,
  style,
  onPressIn,
  onPressOut,
  haptics = false,
  disabled,
  ...rest
}: PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle> | StyleFn;
    /** Fire a light impact haptic on press-in. */
    haptics?: boolean;
  }
>) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(true);
      scale.value = withSpring(0.97, PRESS_IN);
      if (haptics) haptic('impactLight');
      onPressIn?.(e);
    },
    [scale, haptics, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      scale.value = withSpring(1, PRESS_OUT);
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[resolved, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
