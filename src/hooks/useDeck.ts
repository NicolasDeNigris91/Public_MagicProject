'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { fetchDeckForColor } from '@/services/scryfall.client';
import { pickOpponentColor, type Color } from '@/engine/color';

export type DeckSource = 'scryfall' | 'fallback';

export interface UseDeckResult {
  /** Whether both decks have loaded at least once. */
  ready: boolean;
  source: DeckSource | null;
  /** Refetch both decks, keeping the player's color. Opponent color
   *  is re-rolled on each restart so rematches aren't identical. */
  restart: () => void;
  /** The color currently facing the player (for end-of-match UI). */
  opponentColor: Color | null;
}

/**
 * Loads a mono-color deck for the player and a mono-color deck
 * (of a different color) for the opponent. Exposes restart; the
 * opponent color is re-rolled on every call.
 */
export function useDeck(playerColor: Color | null): UseDeckResult {
  const initGame = useGameStore((s) => s.initGame);
  const announce = useGameStore((s) => s.announce);
  const [source, setSource] = useState<DeckSource | null>(null);
  const [opponentColor, setOpponentColor] = useState<Color | null>(null);
  const [ready, setReady] = useState(false);
  const cancelledRef = useRef(false);

  const loadBoth = useCallback(async (player: Color) => {
    const opponent = pickOpponentColor(player);
    setOpponentColor(opponent);
    const [p, o] = await Promise.all([
      fetchDeckForColor(player),
      fetchDeckForColor(opponent),
    ]);
    if (cancelledRef.current) return;
    initGame(p.cards, o.cards);
    const combinedSource: DeckSource = p.source === 'scryfall' && o.source === 'scryfall'
      ? 'scryfall'
      : 'fallback';
    setSource(combinedSource);
    setReady(true);
    if (combinedSource === 'fallback') {
      announce('Could not reach Scryfall. Playing with the built-in offline deck.', 'assertive');
    }
  }, [initGame, announce]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!playerColor) { setReady(false); return; }
    loadBoth(playerColor);
    return () => { cancelledRef.current = true; };
  }, [playerColor, loadBoth]);

  const restart = useCallback(() => {
    if (!playerColor) return;
    loadBoth(playerColor);
  }, [playerColor, loadBoth]);

  return { ready, source, restart, opponentColor };
}
