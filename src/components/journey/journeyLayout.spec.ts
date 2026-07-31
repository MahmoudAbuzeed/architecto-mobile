import {
  nodeStateFor,
  xFractionFor,
  nodeCenter,
  connectorPathD,
  focusIndex,
  lastSolidIndex,
  ROW_HEIGHT,
  type JourneyNodeState,
} from './journeyLayout';
import type { TopicRow } from '@/types';

const topic = (
  slug: string,
  status: TopicRow['status'],
): Pick<TopicRow, 'slug' | 'status'> => ({ slug, status });

const ctx = (over: Partial<Parameters<typeof nodeStateFor>[1]> = {}) => ({
  todaySlug: null,
  doseCompleted: false,
  isPro: false,
  ...over,
});

describe('nodeStateFor', () => {
  it('completed status always wins', () => {
    expect(nodeStateFor(topic('a', 'completed'), ctx({ todaySlug: 'a' }))).toBe(
      'completed',
    );
  });

  it('locked status wins over everything but completed', () => {
    expect(nodeStateFor(topic('a', 'locked'), ctx({ isPro: true }))).toBe(
      'locked',
    );
  });

  it("free user's today node before the dose is spent → today", () => {
    expect(
      nodeStateFor(topic('a', 'available'), ctx({ todaySlug: 'a' })),
    ).toBe<JourneyNodeState>('today');
  });

  it("free user's today node after the dose is spent → todayDone", () => {
    expect(
      nodeStateFor(
        topic('a', 'available'),
        ctx({ todaySlug: 'a', doseCompleted: true }),
      ),
    ).toBe<JourneyNodeState>('todayDone');
  });

  it('free user, a non-today available topic → proGated', () => {
    expect(
      nodeStateFor(topic('b', 'available'), ctx({ todaySlug: 'a' })),
    ).toBe<JourneyNodeState>('proGated');
  });

  it('pro user, any non-today available topic → available', () => {
    expect(
      nodeStateFor(
        topic('b', 'available'),
        ctx({ todaySlug: 'a', isPro: true }),
      ),
    ).toBe<JourneyNodeState>('available');
  });

  it('pro user still sees their today node as today (keeps the dose/streak)', () => {
    expect(
      nodeStateFor(
        topic('a', 'available'),
        ctx({ todaySlug: 'a', isPro: true }),
      ),
    ).toBe<JourneyNodeState>('today');
  });
});

describe('xFractionFor', () => {
  it('cycles the zig-zag every four rows', () => {
    expect([0, 1, 2, 3, 4].map((i) => xFractionFor(i, false))).toEqual([
      0.5, 0.8, 0.5, 0.2, 0.5,
    ]);
  });

  it('mirrors under RTL', () => {
    expect(xFractionFor(1, true)).toBeCloseTo(0.2);
    expect(xFractionFor(3, true)).toBeCloseTo(0.8);
  });
});

describe('nodeCenter', () => {
  it('spaces nodes by ROW_HEIGHT and scales x by width', () => {
    expect(nodeCenter(0, 300, false)).toEqual({ x: 150, y: ROW_HEIGHT / 2 });
    expect(nodeCenter(1, 300, false)).toEqual({
      x: 240,
      y: Math.round(ROW_HEIGHT * 1.5),
    });
  });
});

describe('connectorPathD', () => {
  it('is empty for fewer than two points', () => {
    expect(connectorPathD([])).toBe('');
    expect(connectorPathD([{ x: 1, y: 2 }])).toBe('');
  });

  it('threads points with an S-curve and is deterministic', () => {
    const pts = [
      { x: 10, y: 10 },
      { x: 20, y: 110 },
      { x: 10, y: 210 },
    ];
    const a = connectorPathD(pts);
    const b = connectorPathD(pts);
    expect(a).toBe(b);
    expect(a).toBe('M 10 10 C 10 60 20 60 20 110 C 20 160 10 160 10 210');
  });
});

describe('focusIndex', () => {
  const topics = [
    topic('a', 'completed'),
    topic('b', 'completed'),
    topic('c', 'available'),
    topic('d', 'available'),
  ];

  it('prefers today’s node when present in this category', () => {
    expect(focusIndex(topics, 'c')).toBe(2);
  });

  it('falls back to the first non-completed node', () => {
    expect(focusIndex(topics, null)).toBe(2);
    expect(focusIndex(topics, 'not-here')).toBe(2);
  });

  it('falls back to the last node when everything is completed', () => {
    const done = [topic('a', 'completed'), topic('b', 'completed')];
    expect(focusIndex(done, null)).toBe(1);
  });
});

describe('lastSolidIndex', () => {
  it('is the furthest completed node or today, whichever is later', () => {
    const topics = [
      topic('a', 'completed'),
      topic('b', 'completed'),
      topic('c', 'available'),
      topic('d', 'available'),
    ];
    expect(lastSolidIndex(topics, 'c')).toBe(2);
    expect(lastSolidIndex(topics, null)).toBe(1);
  });

  it('is -1 when nothing has been reached', () => {
    expect(
      lastSolidIndex([topic('a', 'available'), topic('b', 'available')], null),
    ).toBe(-1);
  });
});
