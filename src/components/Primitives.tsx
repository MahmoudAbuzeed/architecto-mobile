import React, { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/tokens';
import { mono } from '@/theme/typography';

/** Safe-area screen root with the theme background. */
export function Screen({
  children,
  style,
  edges = ['top'],
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom'>;
}>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.bg },
        edges.includes('top') && { paddingTop: insets.top },
        edges.includes('bottom') && { paddingBottom: insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Body text on the system font. */
export function AppText({
  children,
  style,
  dim,
  secondary,
  numberOfLines,
}: PropsWithChildren<{
  style?: StyleProp<TextStyle>;
  dim?: boolean;
  secondary?: boolean;
  numberOfLines?: number;
}>) {
  const theme = useTheme();
  const color = dim ? theme.textDim : secondary ? theme.textSecondary : theme.text;
  return (
    <Text numberOfLines={numberOfLines} style={[{ color }, style]}>
      {children}
    </Text>
  );
}

/** JetBrains Mono text (numerics, labels). */
export function MonoText({
  children,
  style,
  weight = 'semiBold',
  color,
  numberOfLines,
}: PropsWithChildren<{
  style?: StyleProp<TextStyle>;
  weight?: keyof typeof mono;
  color?: string;
  numberOfLines?: number;
}>) {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: mono[weight], color: color ?? theme.text }, style]}
    >
      {children}
    </Text>
  );
}

/** Card surface. */
export function Card({
  children,
  style,
  elevated,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; elevated?: boolean }>) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? theme.elevated : theme.card,
          borderColor: theme.border,
        },
        !theme.dark && styles.cardLightShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Light-on-dark filled action button (the design's primary). Pass `inverted`
 * for CTAs sitting ON a dark `elevated` card — the default `theme.action` is
 * near-black in the light theme (same as the card), which would make the button
 * surface disappear; inverted renders a light surface with dark text instead.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  style,
  height = 50,
  inverted,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  inverted?: boolean;
}) {
  const theme = useTheme();
  const bg = inverted ? '#fafafa' : theme.action;
  const fg = inverted ? '#171717' : theme.actionText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: bg,
          height,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.primaryBtnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Bordered / transparent secondary button. */
export function GhostButton({
  label,
  onPress,
  bordered = true,
  style,
  height = 50,
}: {
  label: string;
  onPress: () => void;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghostBtn,
        {
          borderColor: bordered ? theme.borderStrong : 'transparent',
          borderWidth: bordered ? 1 : 0,
          height,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.ghostBtnText,
          { color: bordered ? theme.text : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Pill chip (category filters, EN/ع toggle segments). */
export function Chip({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active?: boolean;
  /** Outline/text color for inactive colored chips (category colors). */
  activeColor?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const isFilled = !!active;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isFilled
          ? { backgroundColor: theme.action }
          : {
              borderWidth: 1,
              borderColor: activeColor
                ? `${activeColor}66`
                : theme.borderStrong,
            },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: isFilled
              ? theme.actionText
              : (activeColor ?? theme.textSecondary),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  cardLightShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  primaryBtn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600' },
  ghostBtn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { fontSize: 14, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
});
