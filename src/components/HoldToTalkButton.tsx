import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { MicIcon } from './icons';
import { useTheme } from '@/theme/useTheme';

function PulseRing({
  active,
  size,
  color,
  delay,
}: {
  active: boolean;
  size: number;
  color: string;
  delay: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (active) {
      t.value = 0;
      t.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1),
      );
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
  }, [active, delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: active ? 0.5 * (1 - t.value) : 0,
    transform: [{ scale: 1 + t.value * 0.55 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * The big mic button. Idle: light disc, "Hold to answer". Held: orange with
 * expanding pulse rings ("Release to finish"). onPressIn/Out drive the
 * speech recognizer in the rep screen.
 */
export function HoldToTalkButton({
  recording,
  onPressIn,
  onPressOut,
  size = 84,
}: {
  recording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ width: size + 12, height: size + 12, alignItems: 'center', justifyContent: 'center' }}>
      <PulseRing active={recording} size={size} color={theme.accent} delay={0} />
      <PulseRing active={recording} size={size} color={theme.accent} delay={700} />
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: recording ? theme.accent : theme.action,
            transform: [{ scale: recording ? 1.06 : pressed ? 1.02 : 1 }],
            shadowColor: recording ? theme.accent : '#000',
          },
        ]}
      >
        <MicIcon
          size={size * 0.36}
          color={theme.dark ? '#17181c' : theme.actionText}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
