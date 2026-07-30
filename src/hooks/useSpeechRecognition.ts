import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';
import { strings } from '@/i18n/strings';

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

export type SpeechErrorKind = 'permission' | 'unavailable';

export interface SpeechState {
  isRecording: boolean;
  /** Finalized segments + live partial, joined. */
  transcript: string;
  /** Friendly i18n message when the engine is unavailable / denied. */
  error: string | null;
  /** Why it failed — 'permission' unlocks the Open Settings affordance. */
  errorKind: SpeechErrorKind | null;
}

/** Permission ⇔ Android code '9' or a denied/unauthorized native message. */
function classifyError(code: string, message: string): SpeechErrorKind {
  if (code === '9' || /denied|permission|not.*authorized/i.test(message)) {
    return 'permission';
  }
  return 'unavailable';
}

function friendlyMessage(kind: SpeechErrorKind): string {
  return kind === 'permission'
    ? strings.rep.micDeniedBody
    : strings.rep.micUnavailableBody;
}

/** How long stop() waits for the final result event before giving up. */
const STOP_FALLBACK_MS = 700;
/** onSpeechEnd → results can still trail on Android; small grace window. */
const STOP_END_GRACE_MS = 150;

export function useSpeechRecognition(locale: string) {
  const [state, setState] = useState<SpeechState>({
    isRecording: false,
    transcript: '',
    error: null,
    errorKind: null,
  });

  // Refs, not state: Voice event callbacks fire outside React's batching.
  const segmentsRef = useRef<string[]>([]);
  const partialRef = useRef('');
  const holdingRef = useRef(false);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  // stop() parks its resolver here; the final onSpeechResults / onSpeechEnd /
  // onSpeechError releases it early instead of a fixed sleep.
  const stopResolverRef = useRef<(() => void) | null>(null);

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
      // The tail just landed — release a pending stop() immediately.
      stopResolverRef.current?.();
    };
    Voice.onSpeechEnd = () => {
      // Android silence auto-stop: keep listening while the mic is held.
      if (holdingRef.current && Platform.OS === 'android') {
        Voice.start(localeRef.current).catch(() => undefined);
        return;
      }
      // Engine went quiet after release: give a trailing result event a
      // short grace window, then let stop() read what it has.
      const release = stopResolverRef.current;
      if (!holdingRef.current && release) {
        setTimeout(release, STOP_END_GRACE_MS);
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
        const kind = classifyError(code, e.error?.message ?? '');
        setState((s) => ({
          ...s,
          isRecording: false,
          error: friendlyMessage(kind),
          errorKind: kind,
        }));
        holdingRef.current = false;
      }
      // Errors never produce more results — don't leave stop() waiting.
      stopResolverRef.current?.();
    };

    return () => {
      holdingRef.current = false;
      stopResolverRef.current?.();
      stopResolverRef.current = null;
      Voice.destroy()
        .then(() => Voice.removeAllListeners())
        .catch(() => undefined);
    };
  }, [emit]);

  const start = useCallback(async () => {
    segmentsRef.current = [];
    partialRef.current = '';
    holdingRef.current = true;
    setState({ isRecording: true, transcript: '', error: null, errorKind: null });
    try {
      await Voice.start(localeRef.current);
    } catch (e) {
      holdingRef.current = false;
      const err = e as { code?: unknown; message?: unknown } | null;
      const kind = classifyError(
        String(err?.code ?? ''),
        e instanceof Error ? e.message : String(err?.message ?? ''),
      );
      setState({
        isRecording: false,
        transcript: '',
        error: friendlyMessage(kind),
        errorKind: kind,
      });
    }
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    holdingRef.current = false;
    // Event-driven settle: the final onSpeechResults releases this resolver
    // the moment the tail lands (onSpeechEnd/onSpeechError also release it),
    // raced against a fallback timeout so a silent engine can't hang us.
    const settled = new Promise<void>((resolve) => {
      stopResolverRef.current = resolve;
      setTimeout(resolve, STOP_FALLBACK_MS);
    });
    try {
      await Voice.stop();
    } catch {
      // stopping a stopped engine is fine
    }
    setState((s) => ({ ...s, isRecording: false }));
    await settled;
    stopResolverRef.current = null;
    return [...segmentsRef.current, partialRef.current]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  return { ...state, start, stop };
}
