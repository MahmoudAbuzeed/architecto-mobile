import { useDailyStore } from './daily.store';
import { learnService } from '@/services/learn.service';
import { useTracksStore } from './tracks.store';
import { useSettingsStore } from './settings.store';
import { todayLocalISO } from '@/lib/dates';
import type { DailyLessonPayload, DailySubmitResponse } from '@/types';

jest.mock('@/services/learn.service', () => ({
  learnService: {
    getDaily: jest.fn(),
    submitDaily: jest.fn(),
  },
}));

// home.store is loaded via dynamic import inside submit — stub the module.
jest.mock('./home.store', () => ({
  useHomeStore: { getState: () => ({ fetch: jest.fn().mockResolvedValue(undefined) }) },
}));

// notifications.service is dynamically imported in submit — stub it. virtual
// because the native-backed module is added in the notifications phase; the
// store already tolerates its absence (the import is caught).
jest.mock(
  '@/services/notifications.service',
  () => ({ syncDailyReminder: jest.fn().mockResolvedValue(undefined) }),
  { virtual: true },
);

const mocked = learnService as jest.Mocked<typeof learnService>;

function payload(over: Partial<DailyLessonPayload> = {}): DailyLessonPayload {
  return {
    date: todayLocalISO(),
    track: 'SYSTEM_DESIGN',
    status: 'ready',
    topic: { slug: 'caching', title: 'Caching', category: 'SYSTEM_DESIGN', categoryName: 'System Design' },
    lesson: {
      lessonId: 'lesson-1',
      title: 'Caching',
      hook: 'Why fast?',
      body: 'Body text',
      keyPoints: ['a', 'b', 'c'],
      estimatedMinutes: 5,
    },
    questions: [{ id: 'q1', question: 'Q?', options: ['a', 'b', 'c', 'd'] }],
    attempt: null,
    streak: { current: 2, longest: 5, doneToday: false },
    ...over,
  };
}

const submitRes: DailySubmitResponse = {
  score: 1,
  total: 1,
  results: [{ id: 'q1', correct: true, correctIndex: 0, explanation: 'because' }],
  xpEarned: 55,
  streak: { current: 3, longest: 5, extended: true },
  trackProgress: { topicsCompleted: 1, topicsTotal: 4, percentComplete: 25 },
  nextTopic: { slug: 'sharding', title: 'Sharding' },
};

beforeEach(() => {
  jest.clearAllMocks();
  useDailyStore.setState({
    daily: null,
    fetchedFor: null,
    isLoading: false,
    error: null,
    unsupported: false,
  });
  useTracksStore.setState({ tracks: { primaryTrack: 'SYSTEM_DESIGN', additionalTracks: [], tracks: [] } } as any);
  useSettingsStore.setState({ contentLanguage: 'en' } as any);
});

describe('daily.store fetch', () => {
  it('stores the payload and fetchedFor key', async () => {
    mocked.getDaily.mockResolvedValue(payload());
    await useDailyStore.getState().fetch();
    const s = useDailyStore.getState();
    expect(s.daily?.status).toBe('ready');
    expect(s.fetchedFor).toEqual({
      date: todayLocalISO(),
      track: 'SYSTEM_DESIGN',
      language: 'en',
    });
    expect(mocked.getDaily).toHaveBeenCalledWith('SYSTEM_DESIGN', 'en');
  });

  it('skips the network when already fetched for today/track/lang', async () => {
    mocked.getDaily.mockResolvedValue(payload());
    await useDailyStore.getState().fetch();
    await useDailyStore.getState().fetch();
    expect(mocked.getDaily).toHaveBeenCalledTimes(1);
  });

  it('refetches with force even when fresh', async () => {
    mocked.getDaily.mockResolvedValue(payload());
    await useDailyStore.getState().fetch();
    await useDailyStore.getState().fetch({ force: true });
    expect(mocked.getDaily).toHaveBeenCalledTimes(2);
  });

  it('refetches when the cached date is stale', async () => {
    mocked.getDaily.mockResolvedValue(payload());
    useDailyStore.setState({
      daily: payload(),
      fetchedFor: { date: '2000-01-01', track: 'SYSTEM_DESIGN', language: 'en' },
    });
    await useDailyStore.getState().fetch();
    expect(mocked.getDaily).toHaveBeenCalledTimes(1);
  });

  it('sets unsupported on a 404 without an error', async () => {
    mocked.getDaily.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
    await useDailyStore.getState().fetch();
    const s = useDailyStore.getState();
    expect(s.unsupported).toBe(true);
    expect(s.error).toBeNull();
  });

  it('keeps the stale payload and records an error on a non-404 failure', async () => {
    useDailyStore.setState({ daily: payload() });
    mocked.getDaily.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: { message: 'boom' } } });
    await useDailyStore.getState().fetch({ force: true });
    const s = useDailyStore.getState();
    expect(s.daily).not.toBeNull();
    expect(s.error).toBe('boom');
    expect(s.unsupported).toBe(false);
  });

  it('does nothing when there is no track', async () => {
    useTracksStore.setState({ tracks: null } as any);
    await useDailyStore.getState().fetch();
    expect(mocked.getDaily).not.toHaveBeenCalled();
  });

  it('force refetch is NOT dropped by an in-flight non-force fetch, and wins', async () => {
    // First (non-force) call resolves slowly with an OLD/stale payload; the
    // force call (fired while the first is in flight) resolves with the fresh
    // payload and must be the one that lands.
    let resolveSlow: (v: DailyLessonPayload) => void = () => {};
    const slow = new Promise<DailyLessonPayload>((r) => (resolveSlow = r));
    mocked.getDaily
      .mockReturnValueOnce(slow as any) // non-force (stale)
      .mockResolvedValueOnce(payload({ status: 'ready' })); // force (fresh)

    const p1 = useDailyStore.getState().fetch(); // non-force, in flight
    const p2 = useDailyStore.getState().fetch({ force: true }); // must proceed
    await p2;
    // Now resolve the stale one — it is superseded and must be ignored.
    resolveSlow(payload({ status: 'track_complete' }));
    await p1;

    expect(mocked.getDaily).toHaveBeenCalledTimes(2);
    expect(useDailyStore.getState().daily?.status).toBe('ready');
  });
});

describe('daily.store submit', () => {
  it('patches the payload to completed and returns the response', async () => {
    useDailyStore.setState({ daily: payload() });
    mocked.submitDaily.mockResolvedValue(submitRes);
    const res = await useDailyStore.getState().submit({ q1: 0 });
    expect(res).toBe(submitRes);
    const s = useDailyStore.getState();
    expect(s.daily?.status).toBe('completed');
    expect(s.daily?.attempt).toMatchObject({ score: 1, total: 1 });
    expect(s.daily?.streak.doneToday).toBe(true);
    expect(mocked.submitDaily).toHaveBeenCalledWith({
      track: 'SYSTEM_DESIGN',
      topicSlug: 'caching',
      answers: { q1: 0 },
    });
  });

  it('rethrows and leaves status ready when submit fails', async () => {
    useDailyStore.setState({ daily: payload() });
    mocked.submitDaily.mockRejectedValue(new Error('network'));
    await expect(useDailyStore.getState().submit({ q1: 0 })).rejects.toThrow('network');
    expect(useDailyStore.getState().daily?.status).toBe('ready');
  });
});
