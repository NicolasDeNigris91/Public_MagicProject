'use client';
import { useCallback, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useCombatStore } from '@/store/useCombatStore';
import { resolveCombat, canAttack } from '@/engine/rules';
import type { ICard } from '@/engine/types';

const SELECT_HINT =
  "selected as attacker. Press a creature on the opponent's side to attack it, or press Attack Directly.";

const fireCombat = (p: Promise<void>) => {
  p.catch((err) => console.error('[combat] runCombat failed', err));
};

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

  /**
   * Preview-then-commit: resolve the combat purely from the current
   * snapshot, await the animation, then let the store commit. Relies
   * on the invariant that no other mutation touches the attacker or
   * blocker between the preview and commit — guaranteed today by the
   * animator's serial queue and the isAnimating guards at every
   * attack entry point (player + AI).
   */
  const runCombat = useCallback(
    async (attackerId: string, blockerId: string | null) => {
      if (useCombatStore.getState().isAnimating) return;
      const state = useGameStore.getState();
      const attacker = state.player.battlefield.find((c) => c.id === attackerId);
      if (!attacker || !canAttack(attacker)) {
        attack(attackerId, blockerId);
        return;
      }
      const blocker = blockerId
        ? state.opponent.battlefield.find((c) => c.id === blockerId) ?? null
        : null;
      const result = resolveCombat(attacker, blocker);

      await useCombatStore.getState().playCombat({
        attackerId,
        targetId: blocker?.id ?? 'opponent-life',
        targetKind: blocker ? 'creature' : 'face',
        attackerDamage: result.blockerDamage,
        targetDamage: result.attackerDamage,
        attackerDies: result.attackerDies,
        targetDies: result.blockerDies,
        faceDamage: result.playerDamage,
      });

      attack(attackerId, blockerId);
    },
    [attack],
  );

  const handleBattlefieldActivate = useCallback((card: ICard) => {
    if (useCombatStore.getState().isAnimating) return;
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
      if (prev) fireCombat(runCombat(prev, card.id));
      return null;
    });
  }, [announce, runCombat]);

  const attackDirectly = useCallback(() => {
    if (useCombatStore.getState().isAnimating) return;
    setSelected((prev) => {
      if (!prev) return null;
      fireCombat(runCombat(prev, null));
      return null;
    });
  }, [runCombat]);

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
