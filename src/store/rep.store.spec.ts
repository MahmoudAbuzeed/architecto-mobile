import { useRepStore } from './rep.store';
import { repService } from '@/services/rep.service';
import type { GradingResponse, ProbeResponse, RepSessionInfo } from '@/types';

/**
 * Probing state transitions: main answer opens a probe turn, probes advance
 * provisional coverage, completion merges the final grade, and old backends
 * (no `session` key) finish in one shot exactly like before.
 */

jest.mock('@/services/rep.service', () => ({
  repService: {
    submitDailyAnswer: jest.fn(),
    submitDrillAnswer: jest.fn(),
    submitProbe: jest.fn(),
  },
}));

jest.mock('./home.store', () => ({
  useHomeStore: {
    getState: () => ({ fetch: jest.fn().mockResolvedValue(undefined) }),
  },
}));

const mocked = repService as jest.Mocked<typeof repService>;

const levelProgress = {
  level: 2,
  levelName: 'Cache Layer',
  totalXp: 220,
  currentLevelXp: 200,
  nextLevelXp: 400,
};

function grading(over: Partial<GradingResponse> = {}): GradingResponse {
  return {
    attemptId: 'attempt-1',
    verdict: 'Workable, with gaps.',
    score: 6,
    scoreLabel: 'almost',
    covered: ['Load balancing'],
    missed: ['Cache invalidation', 'Backpressure'],
    followUp: null,
    xpEarned: 20,
    streak: {
      current: 3,
      longest: 5,
      isNewRecord: false,
      extendedToday: true,
      freezeApplied: false,
    },
    levelProgress,
    celebrate: false,
    ...over,
  };
}

const probingSession: RepSessionInfo = {
  status: 'probing',
  probesUsed: 0,
  maxProbes: 2,
  probe: {
    index: 1,
    question: 'And when the cache lies to you?',
    targetGap: 'Cache invalidation',
  },
};

async function enterProbing(): Promise<void> {
  mocked.submitDrillAnswer.mockResolvedValueOnce(
    grading({ session: probingSession }),
  );
  await useRepStore.getState().submit('my main answer', 'typed', 'en');
}

beforeEach(() => {
  jest.clearAllMocks();
  useRepStore.getState().reset();
  useRepStore.getState().begin({
    drillSlug: 'consistent-hashing',
    title: 'Consistent hashing',
    prompt: 'Explain consistent hashing.',
    budgetSeconds: 300,
  });
});

describe('rep.store probing transitions', () => {
  it('always opts main turns into probing', async () => {
    mocked.submitDrillAnswer.mockResolvedValueOnce(grading());
    await useRepStore.getState().submit('answer', 'typed', 'en');
    expect(mocked.submitDrillAnswer).toHaveBeenCalledWith(
      'consistent-hashing',
      expect.objectContaining({ probing: true, inputMode: 'typed' }),
    );
  });

  it('treats a missing session key as complete (old backend)', async () => {
    mocked.submitDrillAnswer.mockResolvedValueOnce(grading());
    await useRepStore.getState().submit('answer', 'typed', 'en');
    const s = useRepStore.getState();
    expect(s.phase).toBe('done');
    expect(s.result?.attemptId).toBe('attempt-1');
    expect(s.turn.kind).toBe('main');
  });

  it('opens a probe turn when the backend starts a probing session', async () => {
    await enterProbing();
    const s = useRepStore.getState();
    expect(s.phase).toBe('asking');
    expect(s.turn).toMatchObject({
      kind: 'probe',
      attemptId: 'attempt-1',
      number: 1,
      total: 2,
    });
    expect(s.provisional).toEqual({
      covered: ['Load balancing'],
      missed: ['Cache invalidation', 'Backpressure'],
    });
    expect(s.result).toBeNull();
    expect(s.transcript).toBe('');
    expect(s.typedDraft).toBe('');
  });

  it('routes probe turns to submitProbe and advances to the next probe', async () => {
    await enterProbing();
    const nextProbe: ProbeResponse = {
      probeIndex: 1,
      addressed: true,
      feedback: 'TTL plus explicit purge — yes.',
      xpEarned: 15,
      session: {
        status: 'probing',
        probesUsed: 1,
        maxProbes: 2,
        probe: {
          index: 2,
          question: 'And under sudden load?',
          targetGap: 'Backpressure',
        },
      },
      final: null,
      levelProgress,
    };
    mocked.submitProbe.mockResolvedValueOnce(nextProbe);

    await useRepStore.getState().submit('probe answer', 'voice', 'en');

    expect(mocked.submitProbe).toHaveBeenCalledWith('attempt-1', {
      transcript: 'probe answer',
      inputMode: 'voice',
      language: 'en',
    });
    const s = useRepStore.getState();
    expect(s.phase).toBe('asking');
    expect(s.turn).toMatchObject({ kind: 'probe', number: 2, total: 2 });
    // The addressed gap moved from missed → covered.
    expect(s.provisional).toEqual({
      covered: ['Load balancing', 'Cache invalidation'],
      missed: ['Backpressure'],
    });
    expect(s.result).toBeNull();
  });

  it('merges the final grade when a probe completes the session', async () => {
    await enterProbing();
    const completion: ProbeResponse = {
      probeIndex: 1,
      addressed: true,
      feedback: 'Redeemed.',
      xpEarned: 15,
      session: { status: 'complete', probesUsed: 1, maxProbes: 2, probe: null },
      final: {
        score: 8,
        scoreLabel: 'strong',
        verdict: 'Better on the second pass.',
        bonusXp: 10,
        remainingGaps: ['Backpressure'],
      },
      levelProgress,
    };
    mocked.submitProbe.mockResolvedValueOnce(completion);

    await useRepStore.getState().submit('probe answer', 'voice', 'en');

    const s = useRepStore.getState();
    expect(s.phase).toBe('done');
    expect(s.result).toMatchObject({
      attemptId: 'attempt-1',
      score: 8,
      scoreLabel: 'strong',
      verdict: 'Better on the second pass.',
      // initial 20 + probe 15 + bonus 10
      xpEarned: 45,
      followUp: null,
      covered: ['Load balancing', 'Cache invalidation'],
      missed: ['Backpressure'],
    });
  });

  it('keeps the probe turn and transcript-safe phase on a probe failure', async () => {
    await enterProbing();
    mocked.submitProbe.mockRejectedValueOnce(new Error('network blip'));

    await useRepStore.getState().submit('probe answer', 'voice', 'en');

    const s = useRepStore.getState();
    expect(s.phase).toBe('asking'); // voice input returns to the mic layout
    expect(s.turn.kind).toBe('probe');
    expect(s.error).toBe('network blip');
    expect(s.result).toBeNull();
  });

  it('finalizeLocal promotes the banked initial + probe XP to the result', async () => {
    await enterProbing();
    mocked.submitProbe.mockResolvedValueOnce({
      probeIndex: 1,
      addressed: true,
      feedback: 'Good.',
      xpEarned: 15,
      session: {
        status: 'probing',
        probesUsed: 1,
        maxProbes: 2,
        probe: { index: 2, question: 'Next?', targetGap: 'Backpressure' },
      },
      final: null,
      levelProgress,
    });
    await useRepStore.getState().submit('probe answer', 'voice', 'en');

    useRepStore.getState().finalizeLocal();

    const s = useRepStore.getState();
    expect(s.phase).toBe('done');
    expect(s.result).toMatchObject({
      score: 6, // initial grade stands — no server finalization happened
      xpEarned: 35, // initial 20 + probe 15
      followUp: null,
      covered: ['Load balancing', 'Cache invalidation'],
      missed: ['Backpressure'],
    });
  });
});
