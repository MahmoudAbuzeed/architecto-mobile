import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';
import { mono } from '@/theme/typography';
import { haptic } from '@/lib/haptics';

/**
 * Six-slot code field. A single hidden TextInput sits on top and owns the real
 * value (so OS autofill / paste of a 6-digit code still works); the visible
 * slots are display-only. The active slot pulses and each entered digit pops.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);

  const digits = value.split('').slice(0, length);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <OtpSlot
          key={i}
          char={digits[i] ?? ''}
          active={focused && i === activeIndex && value.length < length}
          reduced={reduced}
        />
      ))}
      <TextInput
        style={styles.hiddenInput}
        value={value}
        onChangeText={(next) => {
          const cleaned = next.replace(/[^0-9]/g, '').slice(0, length);
          if (cleaned.length > value.length && !reduced) haptic('selection');
          onChange(cleaned);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
      />
    </View>
  );
}

function OtpSlot({
  char,
  active,
  reduced,
}: {
  char: string;
  active: boolean;
  reduced: boolean;
}) {
  const theme = useTheme();
  const glassBg = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(23,24,28,0.03)';
  const glassBorder = theme.dark ? 'rgba(255,255,255,0.10)' : theme.border;

  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);

  // Pop when this slot goes from empty to filled.
  const prevChar = useRef('');
  useEffect(() => {
    if (char && !prevChar.current && !reduced) {
      scale.value = withSequence(
        withTiming(1.12, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      );
    }
    prevChar.current = char;
  }, [char, reduced, scale]);

  // Breathing highlight on the active slot.
  useEffect(() => {
    if (active && !reduced) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(active ? 1 : 0, { duration: 200 });
    }
  }, [active, reduced, pulse]);

  const restBorder = char ? theme.borderStrong : glassBorder;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: active
      ? interpolateColor(pulse.value, [0, 1], ['rgba(249,115,22,0.5)', theme.accent])
      : restBorder,
  }));

  return (
    <Animated.View
      style={[styles.slot, { backgroundColor: glassBg }, animatedStyle]}
    >
      <Text style={[styles.slotText, { color: theme.text }]}>{char}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slot: {
    flex: 1,
    maxWidth: 50,
    height: 56,
    marginHorizontal: 3,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    fontFamily: mono.semiBold,
    fontSize: 24,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    // Keep the caret/selection off-screen too on Android.
    color: 'transparent',
  },
});
