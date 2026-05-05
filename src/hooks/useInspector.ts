'use client';
import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { ICard } from '@/engine/types';
import type { InspectorSource } from '@/utils/buildInspectorActions';

export interface InspectedRef {
  card: ICard;
  source: InspectorSource;
}

/**
 * Owns the inspector modal: which card is being inspected, opening,
 * closing with focus restore, and auto-closing if the card vanishes
 * from every visible zone (e.g. dies in combat while the modal is up).
 */
export function useInspector() {
  const announce = useGameStore((s) => s.announce);
  const playerHand = useGameStore((s) => s.player.hand);
  const playerField = useGameStore((s) => s.player.battlefield);
  const opponentField = useGameStore((s) => s.opponent.battlefield);
  const [inspected, setInspected] = useState<InspectedRef | null>(null);

  useEffect(() => {
    if (!inspected) return;
    const stillExists =
      playerHand.some((c) => c.id === inspected.card.id) ||
      playerField.some((c) => c.id === inspected.card.id) ||
      opponentField.some((c) => c.id === inspected.card.id);
    if (!stillExists) {
      setInspected(null);
      announce('Card is no longer in play.', 'polite');
    }
  }, [inspected, playerHand, playerField, opponentField, announce]);

  // open: identity stability is incidental (consumed by Hand
  // -> Card -> onActivate, neither of which is React.memo'd).
  // Memoized for symmetry with close/clear and to keep the hook's
  // returned shape uniform.
  const open = useCallback((card: ICard, source: InspectorSource) => {
    setInspected({ card, source });
  }, []);

  // close: identity stability is load-bearing. close is a dep of
  // page.tsx's `inspectorActions` useMemo; a fresh identity per
  // render would invalidate that memo on every render and rebuild
  // the InspectorAction[] array unnecessarily. The functional
  // setState avoids closing over the current value, so the deps
  // array stays empty. requestAnimationFrame waits for the inspector
  // to unmount so the origin button is back in the tree before focus.
  const close = useCallback(() => {
    setInspected((current) => {
      const originId = current?.card.id ?? null;
      if (originId) {
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-card-id="${originId}"]`)?.focus();
        });
      }
      return null;
    });
  }, []);

  // clear: close without focus restore. Used when the origin button
  // no longer exists (game over, tab unmount). Memoization is
  // marginal — kept for the same shape-uniformity reason as open.
  const clear = useCallback(() => setInspected(null), []);

  return { inspected, open, close, clear };
}
