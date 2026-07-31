import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';

// The "living aura": a few slow-drifting radial-gradient orbs in the brand
// hues, behind everything. Each orb rasterizes ONCE (static SVG) and only its
// wrapper transform animates on the UI thread, so this stays cheap even on
// low-end Android. No blur — depth is opacity + hue.
type OrbConfig = {
  id: string;
  color: string;
  size: number;
  /** Absolute anchor. Use left OR right; top is from the top edge. */
  left?: number;
  right?: number;
  top: number;
  /** Center opacity of the gradient (fades to 0 at the edge). */
  centerAlpha: number;
  /** Container opacity, dark theme. Light theme = darkOpacity * lightScale. */
  darkOpacity: number;
  /** Drift deltas applied over one half-cycle. */
  dx?: number;
  dy?: number;
  ds?: number;
  duration: number;
  delay: number;
};

const ORBS: OrbConfig[] = [
  {
    id: 'aurora-a',
    color: '#f97316',
    size: 280,
    left: -60,
    top: 40,
    centerAlpha: 0.55,
    darkOpacity: 0.32,
    dx: 40,
    dy: 30,
    duration: 16000,
    delay: 0,
  },
  {
    id: 'aurora-b',
    color: '#8b5cf6',
    size: 340,
    right: -80,
    top: 170,
    centerAlpha: 0.45,
    darkOpacity: 0.28,
    dx: -50,
    dy: 40,
    ds: 0.08,
    duration: 20000,
    delay: 2000,
  },
  {
    id: 'aurora-c',
    color: '#3b82f6',
    size: 220,
    left: 155,
    top: -70,
    centerAlpha: 0.4,
    darkOpacity: 0.22,
    dy: 36,
    ds: 0.05,
    duration: 22000,
    delay: 4000,
  },
];

// Light theme keeps the hues but drops to pastel washes so text stays AA-legible.
const LIGHT_OPACITY_SCALE = 0.375; // 0.32 -> 0.12, 0.28 -> ~0.105, 0.22 -> ~0.083
// The modal ("calm") uses fewer, dimmer orbs.
const CALM_OPACITY_SCALE = 0.7;

function AuroraOrb({
  orb,
  opacityScale,
  reduced,
}: {
  orb: OrbConfig;
  opacityScale: number;
  reduced: boolean;
}) {
  // Static mid-drift position when reduced motion is on; animates 0<->1 otherwise.
  const p = useSharedValue(reduced ? 0.5 : 0);

  useEffect(() => {
    if (reduced) return;
    p.value = withDelay(
      orb.delay,
      withRepeat(
        withTiming(1, {
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, [p, reduced, orb.delay, orb.duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.value * (orb.dx ?? 0) },
      { translateY: p.value * (orb.dy ?? 0) },
      { scale: 1 + p.value * (orb.ds ?? 0) },
    ],
  }));

  const gradId = `${orb.id}-grad`;

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[
        styles.orb,
        {
          width: orb.size,
          height: orb.size,
          top: orb.top,
          left: orb.left,
          right: orb.right,
          opacity: orb.darkOpacity * opacityScale,
        },
        animatedStyle,
      ]}
    >
      <Svg width={orb.size} height={orb.size}>
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={orb.color} stopOpacity={orb.centerAlpha} />
            <Stop offset="1" stopColor={orb.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={orb.size / 2}
          cy={orb.size / 2}
          r={orb.size / 2}
          fill={`url(#${gradId})`}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * Ambient aurora layer. `full` = 3 orbs (onboarding hero); `calm` = 2 dimmer
 * orbs (the email-auth modal). Anchored to the top region so CTA footers sit on
 * clean background. Fades in over 900ms and, under reduced motion, renders
 * static.
 */
export function AuroraBackground({
  intensity = 'full',
}: {
  intensity?: 'full' | 'calm';
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  const orbs = intensity === 'calm' ? ORBS.slice(0, 2) : ORBS;

  const themeScale = theme.dark ? 1 : LIGHT_OPACITY_SCALE;
  const intensityScale = intensity === 'calm' ? CALM_OPACITY_SCALE : 1;
  const opacityScale = themeScale * intensityScale;

  const fade = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    fade.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });
  }, [fade, reduced]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      pointerEvents="none"
      // Not clipped: orbs bleed past the screen's content padding, and the
      // gradients fade to transparent before reaching the CTA zone anyway.
      style={[StyleSheet.absoluteFill, fadeStyle]}
    >
      {orbs.map((orb) => (
        <AuroraOrb
          key={orb.id}
          orb={orb}
          opacityScale={opacityScale}
          reduced={reduced}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute' },
});
