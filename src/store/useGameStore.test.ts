import { describe, expect, it } from 'vitest';
import { logEntryId, cardId } from '@/engine/types';
import { createGameStore } from './useGameStore';
import type { ICard, LogEntry } from '@/engine/types';

// MAX_LOG is internal to useGameStore.ts (intentionally — it's a tuning knob,
// not part of the contract). Mirroring it here keeps the truncation test
// readable; if the cap moves, this constant has to move with it.
const MAX_LOG = 200;

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

  it('default clock yields a finite Date.now-shaped timestamp', () => {
    const store = createGameStore({ idGen: () => logEntryId('x') });
    const before = Date.now();
    store.getState().announce('m');
    const after = Date.now();
    const ts = store.getState().gameLog[0]?.timestamp;
    expect(typeof ts).toBe('number');
    expect(Number.isFinite(ts)).toBe(true);
    // Bracketed by Date.now() reads on either side proves the default
    // clock is wall-clock-ish, not 0/NaN/undefined.
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('createGameStore — initial state', () => {
  it('has empty hands/decks/battlefields, turn=player, initialized=false, log empty', () => {
    const store = createGameStore();
    const s = store.getState();

    expect(s.player.id).toBe('player');
    expect(s.player.hand).toEqual([]);
    expect(s.player.battlefield).toEqual([]);
    expect(s.player.deck).toEqual([]);

    expect(s.opponent.id).toBe('opponent');
    expect(s.opponent.hand).toEqual([]);
    expect(s.opponent.battlefield).toEqual([]);
    expect(s.opponent.deck).toEqual([]);

    expect(s.turn).toBe('player');
    expect(s.initialized).toBe(false);
    expect(s.gameLog).toEqual([]);
    expect(s.winner).toBeNull();
    expect(s.turnNumber).toBe(1);
    expect(s.generation).toBe(0);
  });
});

describe('createGameStore — announce defaults', () => {
  it('defaults priority to polite and kind to info when omitted', () => {
    const store = createGameStore({ clock: () => 0, idGen: () => logEntryId('x-1') });
    store.getState().announce('hello');
    const entry = store.getState().gameLog[0];
    expect(entry?.priority).toBe('polite');
    expect(entry?.kind).toBe('info');
  });

  it('respects explicit priority/kind/meta when given', () => {
    const store = createGameStore({ clock: () => 0, idGen: () => logEntryId('x-2') });
    store.getState().announce('boom', 'assertive', 'combat', { dmg: 4 });
    const entry = store.getState().gameLog[0];
    expect(entry?.priority).toBe('assertive');
    expect(entry?.kind).toBe('combat');
    expect(entry?.meta).toEqual({ dmg: 4 });
  });
});

describe('createGameStore — gameLog truncation', () => {
  it('announce caps gameLog at MAX_LOG, dropping the oldest entries', () => {
    let n = 0;
    const store = createGameStore({
      clock: () => 0,
      idGen: () => logEntryId(`m-${++n}`),
    });

    const overflow = MAX_LOG + 50;
    for (let i = 0; i < overflow; i++) {
      store.getState().announce(`msg-${i}`);
    }

    const log = store.getState().gameLog;
    expect(log.length).toBe(MAX_LOG);
    // The 50 oldest entries must have been dropped — head is the 51st
    // message (msg-50), tail is msg-249.
    expect(log[0]?.message).toBe(`msg-${overflow - MAX_LOG}`);
    expect(log[log.length - 1]?.message).toBe(`msg-${overflow - 1}`);
  });

  it('action-driven log writes (applyResult) cap gameLog at MAX_LOG too', () => {
    // The truncation expression appears in two places: the announce
    // setter and applyResult. We have to exercise applyResult directly
    // — invoking endTurn after pre-stuffing the log past the cap.
    let n = 0;
    const store = createGameStore({
      clock: () => 0,
      idGen: () => logEntryId(`a-${++n}`),
    });
    store.getState().initGame(deck('p'), deck('o'));

    const filler: LogEntry[] = Array.from({ length: MAX_LOG }, (_, i) => ({
      id: logEntryId(`pre-${i}`),
      message: `pre-${i}`,
      priority: 'polite' as const,
      timestamp: 0,
      kind: 'info' as const,
    }));
    store.setState({ gameLog: filler });

    store.getState().endTurn();

    const log = store.getState().gameLog;
    expect(log.length).toBe(MAX_LOG);
    // endTurn appends ≥1 log entry, so the head must have shifted past
    // pre-0. The exact diff depends on how many entries endTurn pushed,
    // but it can't be pre-0 anymore.
    expect(log[0]?.message).not.toBe('pre-0');
    // Tail must be one of the freshly-appended entries (id starts with `a-`).
    expect(log[log.length - 1]?.id?.startsWith('a-')).toBe(true);
  });
});
