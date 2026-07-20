import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-nitro-sound';

/**
 * Plays Archie's mp3 question audio from a local file path and exposes
 * isPlaying for the wave bars. Wraps react-native-nitro-sound so the player
 * lib can be swapped in one file (fallback: react-native-track-player).
 */
export function useTtsPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const onEndRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      Sound.stopPlayer().catch(() => undefined);
      Sound.removePlayBackListener();
    };
  }, []);

  const play = useCallback(async (path: string, onEnd?: () => void) => {
    onEndRef.current = onEnd ?? null;
    try {
      await Sound.stopPlayer().catch(() => undefined);
      Sound.removePlayBackListener();
      Sound.addPlayBackListener((e) => {
        if (e.duration > 0 && e.currentPosition >= e.duration) {
          setIsPlaying(false);
          Sound.stopPlayer().catch(() => undefined);
          Sound.removePlayBackListener();
          onEndRef.current?.();
          onEndRef.current = null;
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
    }
  }, []);

  const stop = useCallback(async () => {
    setIsPlaying(false);
    await Sound.stopPlayer().catch(() => undefined);
    Sound.removePlayBackListener();
  }, []);

  return { isPlaying, play, stop };
}
