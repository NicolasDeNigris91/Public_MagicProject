'use client';
import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { fetchRandomCreatures } from '@/services/scryfall.client';
import type { ICard } from '@/engine/types';

export type DeckSource = 'scryfall' | 'fallback';

/**
 * Loads the initial deck on mount and exposes a `restart` function
 * that re-deals from the cached pool. Cancels in-flight fetches on
 * unmount so an unmounted page never calls setState.
 */
export function useDeck() {
  const initGame = useGameStore((s) => s.initGame);
  const announce = useGameStore((s) => s.announce);
  const [source, setSource] = useState<DeckSource | null>(null);
  const [cache, setCache] = useState<ICard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchRandomCreatures(40);
      if (cancelled) return;
      setCache(result.cards);
      initGame(result.cards);
      setSource(result.source);
      if (result.source === 'fallback') {
        announce(
          'Could not reach Scryfall. Playing with the built-in offline deck.',
          'assertive',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [initGame, announce]);

  const restart = useCallback(() => {
    if (!cache) return;
    initGame(cache);
  }, [cache, initGame]);

  return { source, restart };
}
