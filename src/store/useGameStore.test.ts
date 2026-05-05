import { describe, expect, it } from 'vitest';
import { logEntryId, cardId } from '@/engine/types';
import { createGameStore } from './useGameStore';
import type { ICard } from '@/engine/types';

function bareCard(id: string, cmc = 1): ICard {
  return {
    id: cardId(id),
    name: id,
    power: 1,
    toughness: 1,
    cmc,
    manaCost: '{R}',
    typeLine: 'Creature - Test',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: id,
  };
}

const deck = (prefix: string): ICard[] =>
  Array.from({ length: 6 }, (_, i) => bareCard(`${prefix}${i}`));

describe('createGameStore — dependency injection', () => {
  it('uses the injected clock for log entry timestamps', () => {
    const store = createGameStore({
      clock: () => 1_700_000_000_000,
      idGen: () => logEntryId('fixed-id'),
    });
    store.getState().initGame(deck('p'), deck('o'));
    const entries = store.getState().gameLog;
    expect(entries.every((e) => e.timestamp === 1_700_000_000_000)).toBe(true);
  });

  it('uses the injected idGen so multiple events get distinct deterministic ids', () => {
    let n = 0;
    const store = createGameStore({
      clock: () => 0,
      idGen: () => logEntryId(`det-${++n}`),
    });
    store.getState().initGame(deck('p'), deck('o'));
    store.getState().announce('second event');
    store.getState().announce('third event');
    const ids = store.getState().gameLog.map((e) => e.id);
    expect(ids).toEqual(['det-1', 'det-2', 'det-3']);
  });

  it('two stores created without overrides have independent log sequences', () => {
    const a = createGameStore();
    const b = createGameStore();
    a.getState().initGame(deck('p'), deck('o'));
    b.getState().initGame(deck('p'), deck('o'));
    // Both should start at log-1; the module-level counter is no
    // longer shared between factory calls.
    expect(a.getState().gameLog[0]?.id).toBe('log-1');
    expect(b.getState().gameLog[0]?.id).toBe('log-1');
  });
});
