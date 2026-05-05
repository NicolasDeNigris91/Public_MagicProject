'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

/**
 * Focus restoration for "play card from hand": when the user plays a
 * card the source button unmounts. `schedule(id)` records the target;
 * the layout effect focuses the matching battlefield button as soon
 * as it lands so keyboard users never drop to <body>.
 */
export function usePostPlayFocus() {
  const battlefield = useGameStore((s) => s.player.battlefield);
  const pending = useRef<string | null>(null);

  useLayoutEffect(() => {
    const target = pending.current;
    if (!target) return;
    if (!battlefield.some((c) => c.id === target)) return;
    document.querySelector<HTMLElement>(`[data-card-id="${target}"]`)?.focus();
    pending.current = null;
  }, [battlefield]);

  return useMemo(
    () => ({
      schedule(id: string) {
        pending.current = id;
      },
      clear() {
        pending.current = null;
      },
    }),
    [],
  );
}
