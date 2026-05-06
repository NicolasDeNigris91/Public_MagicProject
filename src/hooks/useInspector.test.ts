import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { useInspector } from './useInspector';
import { cardId, type ICard } from '@/engine/types';

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

function resetStore(zone: 'hand' | 'playerField' | 'opponentField', cards: ICard[]) {
  useGameStore.setState((s) => {
    if (zone === 'hand') return { player: { ...s.player, hand: cards, battlefield: [] } };
    if (zone === 'playerField') return { player: { ...s.player, hand: [], battlefield: cards } };
    return { opponent: { ...s.opponent, battlefield: cards } };
  });
}

describe('useInspector', () => {
  beforeEach(() => {
    useGameStore.setState((s) => ({
      player: { ...s.player, hand: [], battlefield: [] },
      opponent: { ...s.opponent, battlefield: [] },
      gameLog: [],
    }));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts with no card inspected', () => {
    const { result } = renderHook(() => useInspector());
    expect(result.current.inspected).toBeNull();
  });

  it('open() records the card and source', () => {
    const card = makeCard('a');
    resetStore('hand', [card]);
    const { result } = renderHook(() => useInspector());

    act(() => {
      result.current.open(card, 'hand');
    });

    expect(result.current.inspected?.card.id).toBe(card.id);
    expect(result.current.inspected?.source).toBe('hand');
  });

  it('auto-closes when the inspected card disappears from every visible zone', () => {
    const card = makeCard('a');
    resetStore('playerField', [card]);
    const { result } = renderHook(() => useInspector());
    act(() => {
      result.current.open(card, 'own-field');
    });
    expect(result.current.inspected).not.toBeNull();

    // Remove the card — auto-close kicks in via the effect that
    // checks every zone for membership.
    act(() => {
      resetStore('playerField', []);
    });

    expect(result.current.inspected).toBeNull();
  });

  it('keeps the inspector open as long as the card lives in any zone', () => {
    const card = makeCard('a');
    resetStore('hand', [card]);
    const { result } = renderHook(() => useInspector());
    act(() => {
      result.current.open(card, 'hand');
    });

    // Move the card from hand to opponentField — still present
    // somewhere, so inspector stays.
    act(() => {
      useGameStore.setState((s) => ({
        player: { ...s.player, hand: [] },
        opponent: { ...s.opponent, battlefield: [card] },
      }));
    });

    expect(result.current.inspected).not.toBeNull();
  });

  it('clear() closes without focus restore (no anchor query)', () => {
    const card = makeCard('a');
    resetStore('hand', [card]);
    const { result } = renderHook(() => useInspector());
    act(() => {
      result.current.open(card, 'hand');
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.inspected).toBeNull();
  });

  it('close() restores focus to the origin via requestAnimationFrame', async () => {
    const card = makeCard('a');
    resetStore('hand', [card]);

    // Mount a real button bearing the same data-card-id the inspector
    // queries on close. requestAnimationFrame in jsdom is implemented
    // as setTimeout(fn, 0), so a microtask flush is enough to fire it.
    const origin = document.createElement('button');
    origin.setAttribute('data-card-id', card.id);
    origin.tabIndex = 0;
    document.body.appendChild(origin);

    const { result } = renderHook(() => useInspector());
    act(() => {
      result.current.open(card, 'hand');
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.inspected).toBeNull();

    // Yield to the queued rAF callback.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        resolve();
      }),
    );
    expect(document.activeElement).toBe(origin);
  });

  it('close() with no inspector open is a safe no-op (no rAF query)', () => {
    const { result } = renderHook(() => useInspector());
    expect(result.current.inspected).toBeNull();
    // Should not throw, should not schedule a focus query against a
    // non-existent origin id.
    act(() => {
      result.current.close();
    });
    expect(result.current.inspected).toBeNull();
  });
});
