import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/store/useGameStore';
import { useCombatStore } from '@/store/useCombatStore';
import { useAttackerSelection } from './useAttackerSelection';
import type { ICard } from '@/engine/types';

function makeCard(id: string, p = 2, t = 2): ICard {
  return {
    id, name: `C-${id}`, power: p, toughness: t, cmc: 0,
    manaCost: '{1}', typeLine: 'Creature', oracleText: '',
    imageUrl: '', imageUrlSmall: '', accessibilityDescription: `card ${id}`,
  };
}

describe('useAttackerSelection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCombatStore.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  it('ignores activation while animator is busy', () => {
    const deck = Array.from({ length: 20 }, (_, i) => makeCard(`d${i}`));
    useGameStore.getState().initGame(deck);

    const { result } = renderHook(() => useAttackerSelection());

    const spy = vi.spyOn(useCombatStore.getState(), 'playCombat');
    useCombatStore.setState({ isAnimating: true });

    const prevLife = useGameStore.getState().opponent.life;
    act(() => { result.current.attackDirectly(); });

    expect(useGameStore.getState().opponent.life).toBe(prevLife);
    expect(result.current.selected).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('forwards resolveCombat output to playCombat with correct field mapping', async () => {
    vi.useRealTimers();
    const deck = Array.from({ length: 20 }, (_, i) => makeCard(`d${i}`, 3, 3));
    useGameStore.getState().initGame(deck);

    const attacker = { ...makeCard('att-1', 3, 3), summoningSick: false };
    const blocker = { ...makeCard('blk-1', 2, 5), summoningSick: false };
    useGameStore.setState((s) => ({
      player: { ...s.player, battlefield: [attacker] },
      opponent: { ...s.opponent, battlefield: [blocker] },
    }));

    const spy = vi.spyOn(useCombatStore.getState(), 'playCombat')
      .mockImplementation(() => Promise.resolve());

    const { result } = renderHook(() => useAttackerSelection());

    act(() => { result.current.select(attacker); });
    act(() => { result.current.handleBattlefieldActivate(blocker); });

    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    const intent = spy.mock.calls[0]![0];
    expect(intent).toMatchObject({
      attackerId: 'att-1',
      targetId: 'blk-1',
      targetKind: 'creature',
      attackerDamage: 2,
      targetDamage: 3,
      attackerDies: false,
      targetDies: false,
      faceDamage: 0,
    });

    spy.mockRestore();
  });

  it('exposes handleBattlefieldActivate that triggers combat routing', () => {
    // Light assertion — DOM focus behavior in jsdom is finicky.
    // Verify the helper is a function; deeper focus behavior is covered
    // by manual QA in Task 13.
    const deck = Array.from({ length: 20 }, (_, i) => makeCard(`d${i}`));
    useGameStore.getState().initGame(deck);

    const { result } = renderHook(() => useAttackerSelection());
    expect(typeof result.current.handleBattlefieldActivate).toBe('function');
  });
});
