'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { canPlay } from '@/engine/rules';
import { pickCardToPlay, planAttacks } from '@/engine/ai';
import type { IPlayer } from '@/engine/types';

const PLAY_DELAY_MS = 900;
const ATTACK_DELAY_MS = 1100;
const END_DELAY_MS = 600;

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
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    schedule(() => {
      if (!stillLive()) return;
      const state = useGameStore.getState();
      if (canPlay(state.opponent)) {
        const pick = pickCardToPlay(state.opponent.hand);
        if (pick) useGameStore.getState().playCardToField('opponent', pick.id);
      }

      schedule(() => {
        if (!stillLive()) return;
        const opp = useGameStore.getState().opponent;
        const ready: IPlayer = {
          ...opp,
          battlefield: opp.battlefield.filter((c) => !c.summoningSick),
        };
        const plans = planAttacks(ready, useGameStore.getState().player);

        let i = 0;
        const attackTick = () => {
          if (!stillLive()) return;
          const plan = plans[i++];
          if (!plan) {
            schedule(() => {
              if (!stillLive()) return;
              const store = useGameStore.getState();
              store.announce('Opponent ends their turn.', 'polite');
              store.endTurn();
            }, END_DELAY_MS);
            return;
          }
          useGameStore.getState().attack(plan.attackerId, plan.blockerId);
          schedule(attackTick, ATTACK_DELAY_MS);
        };
        attackTick();
      }, PLAY_DELAY_MS);
    }, PLAY_DELAY_MS);

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [turn]);
}
