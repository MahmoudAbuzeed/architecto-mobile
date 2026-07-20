import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInUp,
  FadeOutUp,
} from 'react-native-reanimated';
import { ArchieCircle } from './ArchieCircle';
import { AppText } from './Primitives';
import { pickQuip } from '@/lib/quips';
import { useTheme } from '@/theme/useTheme';

/**
 * The app-wide loading pattern (design 2d): Archie meditating in his circle,
 * one rotating quip fading through, and a thin scanning progress bar.
 * There are NO spinners anywhere in this app — this is the replacement.
 */
export function QuipLoader({
  pool,
  size = 210,
  showArchie = true,
}: {
  pool: string[];
  size?: number;
  showArchie?: boolean;
}) {
  const theme = useTheme();
  const [quip, setQuip] = useState(() => pickQuip(pool));
  const lastRef = useRef(quip);

  useEffect(() => {
    const id = setInterval(() => {
      const next = pickQuip(pool, lastRef.current);
      lastRef.current = next;
      setQuip(next);
    }, 2600);
    return () => clearInterval(id);
  }, [pool]);

  // Scan bar: a 33%-wide segment sweeping left → right forever.
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [x]);
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 120 }],
  }));

  return (
    <View style={styles.root}>
      {showArchie && <ArchieCircle mood="meditating" size={size} />}
      <View style={styles.quipBox}>
        <Animated.View
          key={quip}
          entering={FadeInUp.duration(350)}
          exiting={FadeOutUp.duration(350)}
        >
          <AppText secondary style={styles.quip}>
            {quip}
          </AppText>
        </Animated.View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <Animated.View
          style={[styles.scanner, { backgroundColor: theme.action }, scanStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 26 },
  quipBox: { height: 24, justifyContent: 'center' },
  quip: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  track: {
    width: 180,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  scanner: {
    width: 60,
    height: '100%',
    borderRadius: 999,
  },
});
