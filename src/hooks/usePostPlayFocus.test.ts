import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { usePostPlayFocus } from './usePostPlayFocus';
import { cardId, type CardId, type ICard } from '@/engine/types';

function makeCard(id: string): ICard {
  return {
    id: cardId(id),
    name: `C-${id}`,
    power: 1,
    toughness: 1,
    cmc: 0,
    manaCost: '{1}',
    typeLine: 'Creature',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: id,
  };
}

function setBattlefield(cards: ICard[]) {
  useGameStore.setState((s) => ({ player: { ...s.player, battlefield: cards } }));
}

function mountAnchor(id: CardId): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.setAttribute('data-card-id', id);
  btn.tabIndex = 0;
  document.body.appendChild(btn);
  return btn;
}

describe('usePostPlayFocus', () => {
  beforeEach(() => {
    setBattlefield([]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the matching battlefield button when a scheduled card lands', () => {
    const { result } = renderHook(() => usePostPlayFocus());
    const id = cardId('a');
    const btn = mountAnchor(id);

    act(() => {
      result.current.schedule(id);
    });
    // Simulate the card hitting the battlefield via a store update.
    act(() => {
      setBattlefield([{ ...makeCard('a'), id }]);
    });

    expect(document.activeElement).toBe(btn);
  });

  it('is a no-op when nothing has been scheduled', () => {
    renderHook(() => usePostPlayFocus());
    const before = document.activeElement;
    act(() => {
      setBattlefield([makeCard('a')]);
    });
    expect(document.activeElement).toBe(before);
  });

  it('does not focus when the scheduled card is not on the battlefield yet', () => {
    const { result } = renderHook(() => usePostPlayFocus());
    const before = document.activeElement;
    act(() => {
      result.current.schedule(cardId('ghost'));
      // A different card lands; pending stays scheduled and untouched.
      setBattlefield([makeCard('a')]);
    });
    expect(document.activeElement).toBe(before);
  });

  it('clear() cancels a pending schedule so a later landing is ignored', () => {
    const { result } = renderHook(() => usePostPlayFocus());
    const id = cardId('a');
    mountAnchor(id);
    const before = document.activeElement;

    act(() => {
      result.current.schedule(id);
      result.current.clear();
      setBattlefield([{ ...makeCard('a'), id }]);
    });

    expect(document.activeElement).toBe(before);
  });
});
