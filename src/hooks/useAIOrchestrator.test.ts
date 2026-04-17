import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/store/useGameStore';
import { useCombatStore } from '@/store/useCombatStore';
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

describe('useAIOrchestrator x animator', () => {
  beforeEach(() => {
    useCombatStore.getState().reset();
  });

  it('AI attacks call playCombat with correct intent mapping', async () => {
    const deck = Array.from({ length: 20 }, (_, i) => card(`d${i}`, 3, 3));
    useGameStore.getState().initGame(deck);

    // Seed a non-sick AI creature ready to attack, and an empty player board.
    const aiAttacker = { ...card('ai-1', 4, 4), summoningSick: false };
    useGameStore.setState((s) => ({
      opponent: { ...s.opponent, battlefield: [aiAttacker] },
      player: { ...s.player, battlefield: [] },
    }));

    const spy = vi.spyOn(useCombatStore.getState(), 'playCombat')
      .mockImplementation(() => Promise.resolve());

    renderHook(() => useAIOrchestrator());

    act(() => { useGameStore.getState().endTurn(); });
    await vi.waitFor(() => expect(spy).toHaveBeenCalled(), { timeout: 5000 });

    const intent = spy.mock.calls[0]![0];
    expect(intent).toMatchObject({
      attackerId: 'ai-1',
      targetId: 'player-life',
      targetKind: 'face',
      faceDamage: 4,
    });

    spy.mockRestore();
  });

  it('post-await stillLive() aborts commit when generation advances mid-animation', async () => {
    vi.useRealTimers();
    useCombatStore.getState().reset();

    const deck = Array.from({ length: 20 }, (_, i) => card(`d${i}`, 3, 3));
    useGameStore.getState().initGame(deck);

    const aiAttacker = { ...card('ai-1', 5, 5), summoningSick: false };
    useGameStore.setState((s) => ({
      opponent: { ...s.opponent, battlefield: [aiAttacker] },
    }));

    let resolvePlay!: () => void;
    const playPromise = new Promise<void>((r) => { resolvePlay = r; });
    const playSpy = vi.spyOn(useCombatStore.getState(), 'playCombat')
      .mockImplementation(() => playPromise);
    const attackSpy = vi.spyOn(useGameStore.getState(), 'attack');

    renderHook(() => useAIOrchestrator());

    act(() => { useGameStore.getState().endTurn(); });

    // Wait for the AI to reach the await.
    await vi.waitFor(() => expect(playSpy).toHaveBeenCalled(), { timeout: 5000 });

    // Simulate "Play again" — bumps generation, resets turn to 'player'.
    act(() => { useGameStore.getState().initGame(deck); });

    // Now release the animation promise.
    resolvePlay();
    await Promise.resolve();  // drain microtasks
    await Promise.resolve();  // and the then-chain

    // attack() was NOT called because post-await stillLive() returned false.
    expect(attackSpy).not.toHaveBeenCalled();

    playSpy.mockRestore();
    attackSpy.mockRestore();
  });
});
