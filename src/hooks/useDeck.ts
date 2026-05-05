'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { pickOpponentColor, type Color } from '@/engine/color';
import { fetchDeckForColor } from '@/services/scryfall.client';
import { useGameStore } from '@/store/useGameStore';

export type DeckSource = 'scryfall' | 'fallback';

// In deterministic mode (visual regression), `pickOpponentColor` is
// passed an RNG that always returns 0 so the alphabetical-first non-
// player color wins every roll. The matchup becomes stable across
// runs without changing the production default of `Math.random`.
const DETERMINISTIC = process.env.NEXT_PUBLIC_MTG_DETERMINISTIC === '1';

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

  // Stable identity is load-bearing here: this callback is in the
  // useEffect dep array below. If `loadBoth` changed every render,
  // the effect would re-run on every parent render and refetch both
  // decks each time — observably broken.
  const loadBoth = useCallback(
    async (player: Color) => {
      const opponent = DETERMINISTIC
        ? pickOpponentColor(player, () => 0)
        : pickOpponentColor(player);
      setOpponentColor(opponent);
      const [p, o] = await Promise.all([fetchDeckForColor(player), fetchDeckForColor(opponent)]);
      if (cancelledRef.current) return;
      initGame(p.cards, o.cards);
      const combinedSource: DeckSource =
        p.source === 'scryfall' && o.source === 'scryfall' ? 'scryfall' : 'fallback';
      setSource(combinedSource);
      setReady(true);
      if (combinedSource === 'fallback') {
        announce('Could not reach Scryfall. Playing with the built-in offline deck.', 'assertive');
      }
    },
    [initGame, announce],
  );

  useEffect(() => {
    cancelledRef.current = false;
    if (!playerColor) {
      setReady(false);
      return;
    }
    void loadBoth(playerColor);
    return () => {
      cancelledRef.current = true;
    };
  }, [playerColor, loadBoth]);

  // restart's identity stability is incidental — its consumer
  // (onPlayAgain in page.tsx) is a click handler whose own arrow
  // closes over restart, so a fresh identity per render would not
  // re-fire anything. Kept memoized for symmetry with loadBoth.
  const restart = useCallback(() => {
    if (!playerColor) return;
    void loadBoth(playerColor);
  }, [playerColor, loadBoth]);

  return { ready, source, restart, opponentColor };
}
