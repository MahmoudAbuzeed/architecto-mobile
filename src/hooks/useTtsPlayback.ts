import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-nitro-sound';

/**
 * Plays an mp3 from a local file path and exposes isPlaying for the wave bars.
 * Wraps react-native-nitro-sound so the player lib can be swapped in one file.
 *
 * `play` accepts an optional `onProgress(positionMs, durationMs)` — fired on
 * every native tick (~60ms) — which the daily lesson uses to drive read-along
 * word highlighting. `pause`/`resume` keep position (unlike `stop`, which
 * resets), so the highlight resumes where it left off.
 */
export function useTtsPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const onEndRef = useRef<(() => void) | null>(null);
  const onProgressRef = useRef<
    ((positionMs: number, durationMs: number) => void) | null
  >(null);

  useEffect(() => {
    return () => {
      Sound.stopPlayer().catch(() => undefined);
      Sound.removePlayBackListener();
    };
  }, []);

  const play = useCallback(
    async (
      path: string,
      onEnd?: () => void,
      onProgress?: (positionMs: number, durationMs: number) => void,
    ) => {
      onEndRef.current = onEnd ?? null;
      onProgressRef.current = onProgress ?? null;
      try {
        await Sound.stopPlayer().catch(() => undefined);
        Sound.removePlayBackListener();
        Sound.addPlayBackListener((e) => {
          if (e.duration > 0) {
            onProgressRef.current?.(e.currentPosition, e.duration);
          }
          if (e.duration > 0 && e.currentPosition >= e.duration) {
            setIsPlaying(false);
            Sound.stopPlayer().catch(() => undefined);
            Sound.removePlayBackListener();
            onEndRef.current?.();
            onEndRef.current = null;
            onProgressRef.current = null;
          }
        });
        await Sound.startPlayer(
          path.startsWith('file://') ? path : `file://${path}`,
        );
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        onEndRef.current?.();
        onEndRef.current = null;
        onProgressRef.current = null;
      }
    },
    [],
  );

  const pause = useCallback(async () => {
    // Keep the listener + callbacks so resume continues the highlight.
    await Sound.pausePlayer().catch(() => undefined);
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    try {
      await Sound.resumePlayer();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setIsPlaying(false);
    onEndRef.current = null;
    onProgressRef.current = null;
    await Sound.stopPlayer().catch(() => undefined);
    Sound.removePlayBackListener();
  }, []);

  return { isPlaying, play, pause, resume, stop };
}
