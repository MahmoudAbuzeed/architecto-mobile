import React, { forwardRef, useEffect, useRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * The app's themed text field (the flow previously used raw, inline-styled
 * TextInputs). Glass surface, an accent focus glow (animated border + a soft
 * outer ring), and an `error` state that turns red and shakes once. Forwards
 * its ref and every TextInput prop.
 */
export const ThemedTextInput = forwardRef<TextInput, TextInputProps & {
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}>(function ThemedTextInputInner(
  { error = false, containerStyle, onFocus, onBlur, style, ...props },
  ref,
) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  const glassBg = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(23,24,28,0.03)';
  const glassBorder = theme.dark ? 'rgba(255,255,255,0.10)' : theme.border;
  const activeBorder = error ? theme.red : theme.accent;
  const restBorder = error ? theme.red : glassBorder;
  const ringColor = error ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.35)';

  const focus = useSharedValue(0);
  const shake = useSharedValue(0);

  // Shake once each time the field enters the error state.
  const wasError = useRef(false);
  useEffect(() => {
    if (error && !wasError.current && !reduced) {
      shake.value = withSequence(
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withTiming(-3, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }
    wasError.current = error;
  }, [error, reduced, shake]);

  // `any` event: the animated TextInput narrows onFocus/onBlur to Reanimated's
  // own event type, which is structurally the same RN event at runtime.
  const handleFocus = (e: any) => {
    focus.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    focus.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) });
    onBlur?.(e);
  };

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const inputStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [restBorder, activeBorder]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle, containerStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: ringColor }, ringStyle]}
      />
      <AnimatedTextInput
        ref={ref}
        placeholderTextColor={theme.textDim}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[styles.input, { backgroundColor: glassBg, color: theme.text }, inputStyle, style]}
        {...props}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.md + 3,
    borderWidth: 1.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
  },
});
