import { describe, expect, it } from 'vitest';
import { logEntryId, cardId } from '@/engine/types';
import { createGameStore, getLangGlobal, setLangGlobal } from './useGameStore';
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

describe('createGameStore — language resolution', () => {
  it('honors injected getLang: en for log resolution', () => {
    const store = createGameStore({
      clock: () => 0,
      idGen: () => logEntryId('en-1'),
      getLang: () => 'en',
    });
    store.getState().initGame(deck('p'), deck('o'));
    const init = store.getState().gameLog[0];
    expect(init?.message).toMatch(/^New match\./);
  });

  it('honors injected getLang: pt for log resolution', () => {
    const store = createGameStore({
      clock: () => 0,
      idGen: () => logEntryId('pt-1'),
      getLang: () => 'pt',
    });
    store.getState().initGame(deck('p'), deck('o'));
    const init = store.getState().gameLog[0];
    expect(init?.message).toMatch(/^Nova partida\./);
  });

  it('singleton picks up setLangGlobal between actions', () => {
    // No injected getLang -> uses the module-level globalLang. Flip it
    // before each action and verify the next log reflects the switch.
    const before = getLangGlobal();
    try {
      const store = createGameStore({
        clock: () => 0,
        idGen: ((): (() => ReturnType<typeof logEntryId>) => {
          let n = 0;
          return () => logEntryId(`g-${++n}`);
        })(),
      });

      setLangGlobal('en');
      store.getState().initGame(deck('p'), deck('o'));
      expect(store.getState().gameLog[0]?.message).toMatch(/^New match\./);

      // Re-init under PT to isolate the second resolution from the
      // first; initGame replaces the entire log slice.
      setLangGlobal('pt');
      store.getState().initGame(deck('p'), deck('o'));
      expect(store.getState().gameLog[0]?.message).toMatch(/^Nova partida\./);
    } finally {
      setLangGlobal(before);
    }
  });

  it('combat.blocked logs interpolate {who} from meta.attackingSide', () => {
    // Drive an actual blocked combat through the store and verify the
    // resolved message string carries the correct localized "who"
    // anchor for both attacker sides. This is the integration check
    // for resolveSeed's special-case {who} substitution.
    const playerSide: ICard = {
      ...bareCard('atk', 1),
      power: 2,
      toughness: 2,
    };
    const opponentBlocker: ICard = {
      ...bareCard('blk', 1),
      power: 2,
      toughness: 2,
    };

    const enStore = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`en-${++n}`);
      })(),
      getLang: () => 'en',
    });
    enStore.setState({
      player: { ...enStore.getState().player, battlefield: [playerSide], manaMax: 1 },
      opponent: {
        ...enStore.getState().opponent,
        battlefield: [opponentBlocker],
        manaMax: 1,
      },
      initialized: true,
    });
    enStore.getState().attack(playerSide.id, opponentBlocker.id);
    const enCombat = enStore.getState().gameLog.at(-1);
    expect(enCombat?.message).toMatch(/^You attacked with/);

    const ptStore = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`pt-${++n}`);
      })(),
      getLang: () => 'pt',
    });
    // turn defaults to 'player' on a fresh store; flip to opponent so
    // the combat log resolves through the byOpponent / "Oponente"
    // {who} branch.
    ptStore.setState({
      turn: 'opponent',
      player: { ...ptStore.getState().player, battlefield: [opponentBlocker], manaMax: 1 },
      opponent: {
        ...ptStore.getState().opponent,
        battlefield: [playerSide],
        manaMax: 1,
      },
      initialized: true,
    });
    ptStore.getState().attack(playerSide.id, opponentBlocker.id);
    const ptCombat = ptStore.getState().gameLog.at(-1);
    expect(ptCombat?.message).toMatch(/^Oponente atacou com/);
  });

  // The four combat.blocked.* templates are special-cased in
  // resolveSeed: each one triggers the {who} substitution. The
  // existing test exercises the .both branch; these three drive
  // each remaining branch so a regression that breaks the {who}
  // injection on attackerOnly / blockerOnly / none surfaces here.
  it('combat.blocked.attackerOnly resolves {who} when only the attacker dies', () => {
    const attacker: ICard = { ...bareCard('atk', 1), power: 1, toughness: 1 };
    const blocker: ICard = { ...bareCard('blk', 1), power: 2, toughness: 2 };
    const store = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`a-${++n}`);
      })(),
      getLang: () => 'en',
    });
    store.setState({
      player: { ...store.getState().player, battlefield: [attacker], manaMax: 1 },
      opponent: { ...store.getState().opponent, battlefield: [blocker], manaMax: 1 },
      initialized: true,
    });
    store.getState().attack(attacker.id, blocker.id);
    const combat = store.getState().gameLog.at(-1);
    // "You attacked with atk, blocked by blk. atk dies."
    expect(combat?.message).toMatch(/^You attacked with/);
    expect(combat?.message).toContain('atk dies');
    expect(combat?.message).not.toContain('blk dies');
  });

  it('combat.blocked.blockerOnly resolves {who} when only the blocker dies', () => {
    const attacker: ICard = { ...bareCard('atk', 1), power: 2, toughness: 2 };
    const blocker: ICard = { ...bareCard('blk', 1), power: 1, toughness: 1 };
    const store = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`a-${++n}`);
      })(),
      getLang: () => 'en',
    });
    store.setState({
      player: { ...store.getState().player, battlefield: [attacker], manaMax: 1 },
      opponent: { ...store.getState().opponent, battlefield: [blocker], manaMax: 1 },
      initialized: true,
    });
    store.getState().attack(attacker.id, blocker.id);
    const combat = store.getState().gameLog.at(-1);
    expect(combat?.message).toMatch(/^You attacked with/);
    expect(combat?.message).toContain('blk dies');
    expect(combat?.message).not.toContain('atk dies');
  });

  it('combat.blocked.none resolves {who} when neither creature dies', () => {
    // 1/3 vs 1/3: each takes 1 dmg, each survives with 2 toughness.
    const attacker: ICard = { ...bareCard('atk', 1), power: 1, toughness: 3 };
    const blocker: ICard = { ...bareCard('blk', 1), power: 1, toughness: 3 };
    const store = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`a-${++n}`);
      })(),
      getLang: () => 'en',
    });
    store.setState({
      player: { ...store.getState().player, battlefield: [attacker], manaMax: 1 },
      opponent: { ...store.getState().opponent, battlefield: [blocker], manaMax: 1 },
      initialized: true,
    });
    store.getState().attack(attacker.id, blocker.id);
    const combat = store.getState().gameLog.at(-1);
    expect(combat?.message).toMatch(/^You attacked with/);
    // Nothing dies: assert the standard "blocked by" form is present
    // without any "X dies" tail.
    expect(combat?.message).toContain('blocked by');
    expect(combat?.message).not.toContain('dies');
  });

  it('getLangGlobal returns whatever setLangGlobal last wrote', () => {
    const before = getLangGlobal();
    try {
      setLangGlobal('es');
      expect(getLangGlobal()).toBe('es');
      setLangGlobal('fr');
      expect(getLangGlobal()).toBe('fr');
      setLangGlobal('en');
      expect(getLangGlobal()).toBe('en');
    } finally {
      setLangGlobal(before);
    }
  });
});

describe('createGameStore — drawCard action', () => {
  it('drawCard("player") moves one card from deck head to hand tail', () => {
    const store = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`d-${++n}`);
      })(),
    });
    store.getState().initGame(deck('p'), deck('o'));
    const handBefore = store.getState().player.hand;
    const deckBefore = store.getState().player.deck;
    expect(deckBefore.length).toBeGreaterThan(0);

    store.getState().drawCard('player');

    const handAfter = store.getState().player.hand;
    const deckAfter = store.getState().player.deck;
    // Hand grew by exactly one entry, deck shrank by one, and the
    // newly-drawn card is the previous deck head appended to hand.
    expect(handAfter.length).toBe(handBefore.length + 1);
    expect(deckAfter.length).toBe(deckBefore.length - 1);
    expect(handAfter[handAfter.length - 1]?.id).toBe(deckBefore[0]?.id);
  });

  it('drawCard("opponent") moves a card on the opponent side too', () => {
    const store = createGameStore({
      clock: () => 0,
      idGen: ((): (() => ReturnType<typeof logEntryId>) => {
        let n = 0;
        return () => logEntryId(`do-${++n}`);
      })(),
    });
    store.getState().initGame(deck('p'), deck('o'));
    const handBefore = store.getState().opponent.hand.length;
    const deckBefore = store.getState().opponent.deck.length;
    store.getState().drawCard('opponent');
    expect(store.getState().opponent.hand.length).toBe(handBefore + 1);
    expect(store.getState().opponent.deck.length).toBe(deckBefore - 1);
  });
});
