import { useEffect, useState } from "react";

/**
 * useState backed by localStorage, defensive by design: storage can be full,
 * disabled (Safari private mode), or hold data from an older app version.
 * Any failure falls back to in-memory state instead of crashing the player.
 */
export function usePersistentState<T>(key: string, initial: () => T, validate: (v: unknown) => v is T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (validate(parsed)) return parsed;
      }
    } catch {
      /* ignore corrupt or unavailable storage */
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota exceeded or storage disabled: keep working in memory */
    }
  }, [key, state]);

  return [state, setState];
}
