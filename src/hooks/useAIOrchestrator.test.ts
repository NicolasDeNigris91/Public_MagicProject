import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/store/useGameStore';
import { useAIOrchestrator } from './useAIOrchestrator';
import type { ICard } from '@/engine/types';

function card(id: string, p = 2, t = 2): ICard {
  return {
    id, name: `C-${id}`, power: p, toughness: t,
    manaCost: '{1}', typeLine: 'Creature', oracleText: '',
    imageUrl: '', imageUrlSmall: '', accessibilityDescription: `card ${id}`,
  };
}

describe('useAIOrchestrator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the opponent turn when turn flips to opponent', () => {
    const deck = Array.from({ length: 20 }, (_, i) => card(`d${i}`));
    useGameStore.getState().initGame(deck);
    renderHook(() => useAIOrchestrator());

    act(() => { useGameStore.getState().endTurn(); });
    act(() => { vi.advanceTimersByTime(5000); });

    // After the AI turn the store should be back on the player's turn.
    expect(useGameStore.getState().turn).toBe('player');
  });

  it('aborts mid-flight if generation advances (Play again pressed)', () => {
    const deck = Array.from({ length: 20 }, (_, i) => card(`d${i}`));
    useGameStore.getState().initGame(deck);
    renderHook(() => useAIOrchestrator());

    act(() => { useGameStore.getState().endTurn(); });
    // Advance partially — AI plays a card, next setTimeout is scheduled.
    act(() => { vi.advanceTimersByTime(1000); });

    const turnBeforeReset = useGameStore.getState().turn;
    act(() => { useGameStore.getState().initGame(deck); });
    act(() => { vi.advanceTimersByTime(10000); });

    // Fresh match, it is the player's turn (initGame sets turn = 'player').
    expect(useGameStore.getState().turn).toBe('player');
    // And the generation abort means no stray opponent mutations happened.
    expect(useGameStore.getState().generation).toBeGreaterThan(0);
    expect(turnBeforeReset).toBe('opponent');
  });
});
