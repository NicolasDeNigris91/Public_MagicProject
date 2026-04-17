'use client';
import { useCallback, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { ICard } from '@/engine/types';

const SELECT_HINT =
  "selected as attacker. Press a creature on the opponent's side to attack it, or press Attack Directly.";

/**
 * Manages the "selected attacker" state and the resulting combat
 * routing. Reads `player.battlefield` via `getState()` inside the
 * activation callback to avoid resubscribing the page on every
 * battlefield change.
 */
export function useAttackerSelection() {
  const attack = useGameStore((s) => s.attack);
  const announce = useGameStore((s) => s.announce);
  const [selected, setSelected] = useState<string | null>(null);

  const handleBattlefieldActivate = useCallback((card: ICard) => {
    const mine = useGameStore
      .getState()
      .player.battlefield.some((c) => c.id === card.id);
    if (mine) {
      setSelected((prev) => {
        const isDeselecting = prev === card.id;
        announce(
          isDeselecting
            ? `${card.name} deselected.`
            : `${card.name} ${SELECT_HINT}`,
          'polite',
        );
        return isDeselecting ? null : card.id;
      });
      return;
    }
    setSelected((prev) => {
      if (prev) attack(prev, card.id);
      return null;
    });
  }, [attack, announce]);

  const attackDirectly = useCallback(() => {
    setSelected((prev) => {
      if (!prev) return null;
      attack(prev, null);
      return null;
    });
  }, [attack]);

  const select = useCallback((card: ICard) => {
    setSelected(card.id);
    announce(`${card.name} ${SELECT_HINT}`, 'polite');
  }, [announce]);

  const deselect = useCallback((card: ICard) => {
    setSelected(null);
    announce(`${card.name} deselected.`, 'polite');
  }, [announce]);

  const clear = useCallback(() => setSelected(null), []);

  return { selected, handleBattlefieldActivate, attackDirectly, select, deselect, clear };
}
