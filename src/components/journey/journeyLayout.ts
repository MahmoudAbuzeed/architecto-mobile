import type { TopicRow } from '@/types';

/**
 * Pure, unit-tested geometry + state logic for the category journey path. No
 * React, no theme — so the winding layout and node-state matrix can be tested
 * without rendering.
 */

export type JourneyNodeState =
  | 'completed' // done — accent check
  | 'today' // today's dose, not yet taken — the glowing START node
  | 'todayDone' // today's dose already taken — "DONE TODAY"
  | 'available' // Pro can start any unlocked topic on demand
  | 'proGated' // free user, a topic beyond today's node — upsell
  | 'locked'; // prerequisites not met

export interface NodeContext {
  /** Slug of today's dose node (only when it lives in THIS category). */
  todaySlug: string | null;
  /** Whether today's dose is already spent. */
  doseCompleted: boolean;
  /** Pro users can start any unlocked topic; free users only today's node. */
  isPro: boolean;
}

/** Node height (vertical spacing between consecutive nodes), in px. Sized to
 * fit a disc + a two-line title + the today pill without rows colliding. */
export const ROW_HEIGHT = 132;
/** Regular node diameter. */
export const NODE_SIZE = 56;
/** Today's node is larger to pull the eye. */
export const TODAY_NODE_SIZE = 72;

// The winding rhythm: fraction of the usable width for each node, cycling every
// 4 rows. Center → right → center → left, the classic Duolingo sway.
const ZIGZAG = [0.5, 0.8, 0.5, 0.2];

/**
 * The state that decides how a node renders and what a tap does. Order matters:
 * a completed topic always reads as done; a locked topic always reads as
 * locked; only then does today's dose win; everything else is available (Pro)
 * or pro-gated (free).
 */
export function nodeStateFor(
  topic: Pick<TopicRow, 'slug' | 'status'>,
  ctx: NodeContext,
): JourneyNodeState {
  if (topic.status === 'completed') return 'completed';
  if (topic.status === 'locked') return 'locked';
  if (ctx.todaySlug && topic.slug === ctx.todaySlug) {
    return ctx.doseCompleted ? 'todayDone' : 'today';
  }
  // status === 'available' — an unlocked topic that isn't today's dose.
  return ctx.isPro ? 'available' : 'proGated';
}

/** Horizontal fraction [0..1] of the usable width for node `index`. RTL mirrors. */
export function xFractionFor(index: number, rtl: boolean): number {
  const x = ZIGZAG[index % ZIGZAG.length];
  return rtl ? 1 - x : x;
}

/** Absolute center of node `index` within a `width`-wide track. */
export function nodeCenter(
  index: number,
  width: number,
  rtl: boolean,
): { x: number; y: number } {
  return {
    x: Math.round(xFractionFor(index, rtl) * width),
    y: Math.round(index * ROW_HEIGHT + ROW_HEIGHT / 2),
  };
}

/**
 * An SVG path string (cubic béziers) threading the given node centers with a
 * vertical S-curve between each pair. Deterministic — same points, same string.
 * Returns '' for fewer than two points.
 */
export function connectorPathD(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const midY = Math.round((a.y + b.y) / 2);
    d += ` C ${a.x} ${midY} ${b.x} ${midY} ${b.x} ${b.y}`;
  }
  return d;
}

/**
 * Index of the node the path should scroll to on open: today's node if it's in
 * this category, else the first non-completed node, else the last node.
 */
export function focusIndex(
  topics: Array<Pick<TopicRow, 'slug' | 'status'>>,
  todaySlug: string | null,
): number {
  if (todaySlug) {
    const i = topics.findIndex((t) => t.slug === todaySlug);
    if (i >= 0) return i;
  }
  const firstOpen = topics.findIndex((t) => t.status !== 'completed');
  return firstOpen >= 0 ? firstOpen : Math.max(0, topics.length - 1);
}

/**
 * Index of the last node that should be on the SOLID (traversed) part of the
 * connector — the furthest completed node, or today's node. Everything after is
 * dashed (not yet reached). -1 when nothing is traversed yet.
 */
export function lastSolidIndex(
  topics: Array<Pick<TopicRow, 'slug' | 'status'>>,
  todaySlug: string | null,
): number {
  let last = -1;
  topics.forEach((t, i) => {
    if (t.status === 'completed') last = i;
    if (todaySlug && t.slug === todaySlug) last = Math.max(last, i);
  });
  return last;
}
