'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useCombatStore } from '@/store/useCombatStore';
import { resolveCombat } from '@/engine/rules';
import { pickCardToPlay, planAttacks } from '@/engine/ai';
import type { IPlayer } from '@/engine/types';
import {
  AI_ATTACK_DELAY_MS,
  AI_END_DELAY_MS,
  AI_PLAY_DELAY_MS,
} from '@/constants/timings';

/**
 * Runs the opponent's turn from the UI layer. Fires when `turn`
 * becomes `'opponent'`. Captures the store's `generation` counter at
 * each tick and aborts if it advances (Play again during AI tail).
 */
export function useAIOrchestrator() {
  const turn = useGameStore((s) => s.turn);

  useEffect(() => {
    if (turn !== 'opponent') return;
    const gen = useGameStore.getState().generation;

    // Abort if match changed (gen), game ended (winner), or phase
    // changed (turn). All three must hold for the tick to proceed.
    const stillLive = () => {
      const s = useGameStore.getState();
      return s.generation === gen && !s.winner && s.turn === 'opponent';
    };

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (fn: () => void | Promise<void>, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        try {
          const result = fn();
          if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch((err) => {
              console.error('[ai] scheduled task failed', err);
            });
          }
        } catch (err) {
          console.error('[ai] scheduled task failed', err);
        }
      }, ms);
      timers.add(id);
    };

    const startCombatPhase = () => {
      if (!stillLive()) return;
      const opp = useGameStore.getState().opponent;
      const ready: IPlayer = {
        ...opp,
        battlefield: opp.battlefield.filter((c) => !c.summoningSick),
      };
      const plans = planAttacks(ready, useGameStore.getState().player);

      let i = 0;
      const attackTick = async () => {
        if (!stillLive()) return;
        const plan = plans[i++];
        if (!plan) {
          schedule(() => {
            if (!stillLive()) return;
            const store = useGameStore.getState();
            store.announce('Opponent ends their turn.', 'polite');
            store.endTurn();
          }, AI_END_DELAY_MS);
          return;
        }

        const curr = useGameStore.getState();
        const attacker = curr.opponent.battlefield.find((c) => c.id === plan.attackerId);
        const blocker = plan.blockerId
          ? curr.player.battlefield.find((c) => c.id === plan.blockerId) ?? null
          : null;
        if (attacker) {
          const result = resolveCombat(attacker, blocker);
          await useCombatStore.getState().playCombat({
            attackerId: plan.attackerId,
            targetId: blocker?.id ?? 'player-life',
            targetKind: blocker ? 'creature' : 'face',
            attackerDamage: result.blockerDamage,
            targetDamage: result.attackerDamage,
            attackerDies: result.attackerDies,
            targetDies: result.blockerDies,
            faceDamage: result.playerDamage,
          });
          // Re-check stillLive AFTER the await - the store's turn,
          // generation, or winner may have changed during the animation.
          if (!stillLive()) return;
        }

        useGameStore.getState().attack(plan.attackerId, plan.blockerId);
        schedule(attackTick, AI_ATTACK_DELAY_MS);
      };
      Promise.resolve(attackTick()).catch((err) =>
        console.error('[ai] attackTick failed', err),
      );
    };

    // Greedy main phase: pick the highest-power affordable creature each
    // tick, play it, then re-evaluate. Reads fresh state every iteration so
    // `manaAvailable` decreases between picks. Stops when no creature in
    // hand is affordable, then hands off to combat.
    const playTick = () => {
      if (!stillLive()) return;
      const state = useGameStore.getState();
      const pick = pickCardToPlay(state.opponent.hand, state.opponent.manaAvailable);
      if (pick) {
        useGameStore.getState().playCardToField('opponent', pick.id);
        schedule(playTick, AI_PLAY_DELAY_MS);
      } else {
        schedule(startCombatPhase, AI_PLAY_DELAY_MS);
      }
    };

    schedule(playTick, AI_PLAY_DELAY_MS);

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [turn]);
}
