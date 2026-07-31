import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';
import { JourneyNode } from './JourneyNode';
import {
  ROW_HEIGHT,
  xFractionFor,
  connectorPathD,
  focusIndex,
  lastSolidIndex,
  nodeStateFor,
  type JourneyNodeState,
} from './journeyLayout';
import { useTheme } from '@/theme/useTheme';
import { journeyCopyFor } from '@/i18n/journey-copy';
import { useSettingsStore } from '@/store/settings.store';
import type { TopicRow } from '@/types';

// Fixed column width per node so titles never clip at the extremes; the zig-zag
// is inset by half a column so every node stays fully on screen.
const COL_W = 156;
const TOP_PAD = 12;
const BOTTOM_PAD = 40;

/**
 * The winding journey path for one category: a vertical S-curve of topic nodes
 * (completed → today → upcoming), auto-scrolled to today's node. Replaces the
 * old flat topic list. Layout is computed (not measured): node centers come
 * straight from the index + the container width.
 */
export function JourneyPath({
  topics,
  todaySlug,
  doseCompleted,
  isPro,
  accent,
  rtl,
  onNodePress,
}: {
  topics: TopicRow[];
  todaySlug: string | null;
  doseCompleted: boolean;
  isPro: boolean;
  accent: string;
  rtl: boolean;
  onNodePress: (topic: TopicRow, state: JourneyNodeState) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const language = useSettingsStore((s) => s.contentLanguage);
  const copy = journeyCopyFor(language);

  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const didScroll = useRef(false);

  const totalHeight = topics.length * ROW_HEIGHT + BOTTOM_PAD;

  // Node centers, inset by half a column so the extremes stay on screen.
  const centers = topics.map((_, i) => {
    const inner = Math.max(0, width - COL_W);
    return {
      x: COL_W / 2 + xFractionFor(i, rtl) * inner,
      y: TOP_PAD + i * ROW_HEIGHT + ROW_HEIGHT / 2,
    };
  });

  const solidEnd = lastSolidIndex(topics, todaySlug);
  const solidPath =
    solidEnd >= 1 ? connectorPathD(centers.slice(0, solidEnd + 1)) : '';
  const dashedPath = connectorPathD(centers.slice(Math.max(solidEnd, 0)));

  // Auto-scroll to today's node once we know both dimensions.
  useEffect(() => {
    if (didScroll.current || width === 0 || viewportH === 0) return;
    didScroll.current = true;
    const i = focusIndex(topics, todaySlug);
    const y = Math.max(0, TOP_PAD + i * ROW_HEIGHT - viewportH * 0.35);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y, animated: !reduced }),
    );
  }, [width, viewportH, topics, todaySlug, reduced]);

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
      contentContainerStyle={styles.content}
    >
      <View
        style={{ height: totalHeight }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <>
            <Svg
              width={width}
              height={totalHeight}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {!!dashedPath && (
                <Path
                  d={dashedPath}
                  stroke={theme.borderStrong}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="1 10"
                  fill="none"
                />
              )}
              {!!solidPath && (
                <Path
                  d={solidPath}
                  stroke={accent}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeOpacity={0.9}
                  fill="none"
                />
              )}
            </Svg>
            {topics.map((topic, i) => {
              const state = nodeStateFor(topic, { todaySlug, doseCompleted, isPro });
              const center = centers[i];
              // Every node is tappable; the handler decides per state (a locked
              // tap opens the prerequisite dialog, a pro-gated tap the paywall).
              return (
                <View
                  key={topic.slug}
                  style={[
                    styles.nodeSlot,
                    { left: center.x - COL_W / 2, top: center.y - ROW_HEIGHT / 2 },
                  ]}
                  pointerEvents="box-none"
                >
                  <JourneyNode
                    title={topic.title}
                    state={state}
                    accent={accent}
                    rtl={rtl}
                    index={i}
                    copy={copy}
                    onPress={() => onNodePress(topic, state)}
                  />
                </View>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  nodeSlot: {
    position: 'absolute',
    width: COL_W,
    alignItems: 'center',
    paddingTop: 4,
  },
});
