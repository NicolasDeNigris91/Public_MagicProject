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

  const open = useCallback((card: ICard, source: InspectorSource) => {
    setInspected({ card, source });
  }, []);

  // Functional setState lets close be referentially stable. The
  // requestAnimationFrame waits for the inspector to unmount so the
  // origin button is back in the tree before we focus it.
  const close = useCallback(() => {
    setInspected((current) => {
      const originId = current?.card.id ?? null;
      if (originId) {
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-card-id="${originId}"]`)
            ?.focus();
        });
      }
      return null;
    });
  }, []);

  // Close without focus restore - used when the origin button no
  // longer exists (game over, tab unmount).
  const clear = useCallback(() => setInspected(null), []);

  return { inspected, open, close, clear };
}
