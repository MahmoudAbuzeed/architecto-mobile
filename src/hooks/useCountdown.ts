import { useEffect, useRef, useState } from 'react';

/** Ticks down from `seconds` once `running`; clamps at 0. */
export function useCountdown(seconds: number, running: boolean): number {
  const [remaining, setRemaining] = useState(seconds);
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    endAtRef.current = null;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    if (endAtRef.current === null) {
      endAtRef.current = Date.now() + remaining * 1000;
    }
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.round(((endAtRef.current ?? 0) - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remaining is intentionally read once at start
  }, [running]);

  return remaining;
}
