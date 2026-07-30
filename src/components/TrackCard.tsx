import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, MonoText } from './Primitives';
import { ProgressBar } from './ProgressBar';
import { CircleCheckIcon } from './icons';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import { trackEmoji } from '@/lib/trackVisuals';
import type { TrackSummary } from '@/types';

/** One track row in the TrackPicker: hex-tinted icon, progress, primary check. */
export function TrackCard({
  track,
  onPress,
  disabled,
}: {
  track: TrackSummary;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const fraction =
    track.topicsTotal > 0 ? track.topicsCompleted / track.topicsTotal : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.55 : pressed ? 0.7 : 1 })}
    >
      <Card
        style={[
          styles.card,
          track.isPrimary && { borderColor: `${track.hex}66` },
        ]}
      >
        <View style={[styles.iconDisc, { backgroundColor: `${track.hex}2E` }]}>
          <AppText style={styles.icon}>{trackEmoji(track.track)}</AppText>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText style={styles.label} numberOfLines={1}>
              {track.label}
            </AppText>
            {track.isPrimary ? (
              <MonoText
                weight="semiBold"
                color={track.hex}
                style={styles.currentTag}
              >
                {strings.trackPicker.current}
              </MonoText>
            ) : track.isAdditional ? (
              <MonoText
                weight="semiBold"
                color={theme.textDim}
                style={styles.currentTag}
              >
                {strings.trackPicker.open}
              </MonoText>
            ) : null}
          </View>
          <MonoText weight="medium" color={theme.textDim} style={styles.meta}>
            {strings.learn.topicsProgress(track.topicsCompleted, track.topicsTotal)}
            {' · '}
            {track.drillCount} drills
          </MonoText>
          <ProgressBar fraction={fraction} color={track.hex} height={5} />
        </View>
        {track.isPrimary && <CircleCheckIcon size={18} color={track.hex} />}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 19 },
  body: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  currentTag: { fontSize: 9, letterSpacing: 1.2 },
  meta: { fontSize: 10.5 },
});
