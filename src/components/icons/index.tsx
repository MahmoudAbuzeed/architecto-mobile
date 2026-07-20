import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Icon paths lifted verbatim from the approved design HTML (24x24 viewBox,
// stroke-based unless noted) so the app matches the mocks pixel-for-pixel.

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function MicIcon({ size = 24, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={9} y={3} width={6} height={12} rx={3} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 18v3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function KeyboardIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={12} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color = '#fff', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function FlameIcon({
  size = 24,
  color = '#f97316',
  glow = true,
}: IconProps & { glow?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glow && <Circle cx={12} cy={14} r={10} fill={color} opacity={0.14} />}
      <Path
        d="M12 2c2 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-4 2-6 1 2 2 3 3 4 0-2 0-5 0-8z"
        fill={color}
      />
      <Path
        d="M12 9c1 2 2.4 3 2.4 4.6a2.4 2.4 0 0 1-4.8 0C9.6 12.2 11 11 12 9z"
        fill="#fef3c7"
      />
    </Svg>
  );
}

export function FlameOutlineIcon({ size = 24, color = '#f97316', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c2 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-4 2-6 1 2 2 3 3 4 0-2 0-5 0-8z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BoltIcon({ size = 24, color = '#eab308' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" fill={color} />
    </Svg>
  );
}

export function PlayIcon({ size = 24, color = '#17181c' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4l13 8-13 8z" fill={color} />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = '#10b981', strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CircleCheckIcon({ size = 24, color = '#10b981', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.5 12.5l2.5 2.5 4.5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 24, color = '#6b6b70', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 24, color = '#17181c', strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MissedIcon({ size = 24, color = '#f59e0b', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={18.5} r={1.3} fill={color} />
    </Svg>
  );
}

export function HomeIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5 12 3l9 7.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9.5V21h14V9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function StatsIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20V10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M10 20V4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M16 20v-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M22 20H2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileIcon({ size = 24, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
