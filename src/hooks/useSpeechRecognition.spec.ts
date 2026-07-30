import { act, renderHook } from '@testing-library/react-native';
import Voice from '@react-native-voice/voice';
import { useSpeechRecognition } from './useSpeechRecognition';
import { strings } from '@/i18n/strings';

/**
 * stop()-race behavior: the resolver must release early on the final result
 * event (tail preserved), fall back after 700ms when the engine goes silent,
 * and error events must classify + release. The voice lib is the jest.setup
 * mock — a plain object the hook assigns its handlers onto, so tests fire
 * native events by calling those handlers directly.
 */

type VoiceEvents = {
  onSpeechPartialResults?: (e: { value?: string[] }) => void;
  onSpeechResults?: (e: { value?: string[] }) => void;
  onSpeechEnd?: () => void;
  onSpeechError?: (e: { error?: { code?: string; message?: string } }) => void;
};

const voice = Voice as unknown as VoiceEvents;

describe('useSpeechRecognition stop() race', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves as soon as the final result event lands, tail included', async () => {
    const { result } = renderHook(() => useSpeechRecognition('en-US'));
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      voice.onSpeechPartialResults?.({ value: ['the quick'] });
    });

    let stopPromise!: Promise<string>;
    let transcript: string | null = null;
    await act(async () => {
      stopPromise = result.current.stop();
      await Promise.resolve(); // let Voice.stop() settle inside act
    });

    // The recognizer flushes its final segment — including the tail words
    // spoken right before release — after stop() was requested.
    act(() => {
      voice.onSpeechResults?.({ value: ['the quick brown fox'] });
    });
    // No timer advance: resolution must be event-driven, not the fallback.
    await act(async () => {
      transcript = await stopPromise;
    });
    expect(transcript).toBe('the quick brown fox');
  });

  it('falls back after 700ms when no events arrive', async () => {
    const { result } = renderHook(() => useSpeechRecognition('en-US'));
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      voice.onSpeechPartialResults?.({ value: ['hello there'] });
    });

    let stopPromise!: Promise<string>;
    let settled = false;
    await act(async () => {
      stopPromise = result.current.stop();
      void stopPromise.then(() => {
        settled = true;
      });
      await Promise.resolve();
    });
    expect(settled).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(699);
      await Promise.resolve();
    });
    expect(settled).toBe(false);

    let transcript: string | null = null;
    await act(async () => {
      jest.advanceTimersByTime(1);
      transcript = await stopPromise;
    });
    // The partial is all we ever got — stop() still returns it.
    expect(transcript).toBe('hello there');
  });

  it("classifies error code 9 as 'permission' with the friendly message", async () => {
    const { result } = renderHook(() => useSpeechRecognition('en-US'));
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      voice.onSpeechError?.({
        error: { code: '9', message: 'ERROR_INSUFFICIENT_PERMISSIONS' },
      });
    });
    expect(result.current.errorKind).toBe('permission');
    expect(result.current.error).toBe(strings.rep.micDeniedBody);
    expect(result.current.isRecording).toBe(false);
  });

  it("classifies denied-message errors as 'permission' and others as 'unavailable'", async () => {
    const { result } = renderHook(() => useSpeechRecognition('en-US'));
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      voice.onSpeechError?.({
        error: { code: '5', message: 'User denied access to speech recognition' },
      });
    });
    expect(result.current.errorKind).toBe('permission');

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBeNull();
    act(() => {
      voice.onSpeechError?.({ error: { code: '2', message: 'Network error' } });
    });
    expect(result.current.errorKind).toBe('unavailable');
    expect(result.current.error).toBe(strings.rep.micUnavailableBody);
  });
});
