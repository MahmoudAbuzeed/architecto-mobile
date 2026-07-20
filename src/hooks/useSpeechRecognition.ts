import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';

/**
 * Hold-to-talk speech recognition over @react-native-voice/voice.
 *
 * All STT usage goes through this hook so the native lib can be swapped in
 * one file (documented fallback: expo-speech-recognition via
 * `npx install-expo-modules`) if voice breaks on a future New-Arch release.
 *
 * Android quirk this hook owns: SpeechRecognizer auto-stops on silence. While
 * the button is still held we finalize the segment and restart recognition,
 * appending segments into one transcript.
 */

export interface SpeechState {
  isRecording: boolean;
  /** Finalized segments + live partial, joined. */
  transcript: string;
  /** Non-null when the engine is unavailable / permission denied. */
  error: string | null;
}

export function useSpeechRecognition(locale: string) {
  const [state, setState] = useState<SpeechState>({
    isRecording: false,
    transcript: '',
    error: null,
  });

  // Refs, not state: Voice event callbacks fire outside React's batching.
  const segmentsRef = useRef<string[]>([]);
  const partialRef = useRef('');
  const holdingRef = useRef(false);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const emit = useCallback(() => {
    const transcript = [...segmentsRef.current, partialRef.current]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    setState((s) => ({ ...s, transcript }));
  }, []);

  useEffect(() => {
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      partialRef.current = e.value?.[0] ?? '';
      emit();
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const final = e.value?.[0] ?? '';
      if (final) segmentsRef.current.push(final);
      partialRef.current = '';
      emit();
    };
    Voice.onSpeechEnd = () => {
      // Android silence auto-stop: keep listening while the mic is held.
      if (holdingRef.current && Platform.OS === 'android') {
        Voice.start(localeRef.current).catch(() => undefined);
      }
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      // "No match" / "speech timeout" are normal pauses; restart while held.
      const code = String(e.error?.code ?? '');
      const benign = ['7', '6', 'recognition_fail'].includes(code);
      if (holdingRef.current && benign) {
        Voice.start(localeRef.current).catch(() => undefined);
        return;
      }
      if (!benign) {
        setState((s) => ({
          ...s,
          isRecording: false,
          error:
            e.error?.message ??
            'Speech recognition is unavailable — try typing instead.',
        }));
        holdingRef.current = false;
      }
    };

    return () => {
      holdingRef.current = false;
      Voice.destroy()
        .then(() => Voice.removeAllListeners())
        .catch(() => undefined);
    };
  }, [emit]);

  const start = useCallback(async () => {
    segmentsRef.current = [];
    partialRef.current = '';
    holdingRef.current = true;
    setState({ isRecording: true, transcript: '', error: null });
    try {
      await Voice.start(localeRef.current);
    } catch (e) {
      holdingRef.current = false;
      setState({
        isRecording: false,
        transcript: '',
        error:
          e instanceof Error
            ? e.message
            : 'Could not start the microphone — try typing instead.',
      });
    }
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    holdingRef.current = false;
    try {
      await Voice.stop();
    } catch {
      // stopping a stopped engine is fine
    }
    setState((s) => ({ ...s, isRecording: false }));
    // Give the final onSpeechResults a beat to land before reading.
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 350);
    });
    return [...segmentsRef.current, partialRef.current]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  return { ...state, start, stop };
}
