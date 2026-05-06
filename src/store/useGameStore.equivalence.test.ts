import { describe, expect, it } from 'vitest';
import { cardId, logEntryId } from '@/engine/types';
import { createGameStore } from './useGameStore';
import type { ICard, IGameState } from '@/engine/types';

/**
 * Equivalence-snapshot tests for the store's action layer.
 *
 * Each test runs a deterministic input sequence against a fresh
 * store with fixed `clock` and `idGen`, then snapshots the entire
 * IGameState (player + opponent + log + winner + turn + counters).
 * The point is to lock down the EXACT byte shape of state and log
 * after every action, so a future refactor (e.g. moving attack /
 * endTurn into a pure engine/actions.ts) can be validated against
 * these snapshots — byte-identical or it doesn't merge.
 *
 * Tests intentionally bypass the live React/Zustand subscription and
 * drive the store via getState().<action>(...). Decks are minimal,
 * hand-built, deterministic; no fallback / scryfall reachability.
 *
 * If a snapshot legitimately needs to change, fix the announcer
 * copy and regenerate via `vitest run -u`. The diff in the snapshot
 * file is the contract change that reviewers see.
 */

const CLOCK = () => 1_700_000_000_000;
const idGen = () => {
  let seq = 0;
  return () => logEntryId(`log-${++seq}`);
};

function bareCard(id: string, power = 2, toughness = 2, cmc = 1): ICard {
  return {
    id: cardId(id),
    name: id.toUpperCase(),
    power,
    toughness,
    cmc,
    color: 'R',
    manaCost: cmc === 1 ? '{R}' : `{${cmc - 1}}{R}`,
    typeLine: 'Creature',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: `${id.toUpperCase()}. Creature. Power ${power}, toughness ${toughness}.`,
  };
}

const playerDeck: ICard[] = [
  bareCard('p0', 1, 1, 1),
  bareCard('p1', 2, 2, 1),
  bareCard('p2', 3, 3, 2),
  bareCard('p3', 4, 4, 3),
  bareCard('p4', 5, 5, 4),
  bareCard('p5', 1, 1, 1),
  bareCard('p6', 2, 2, 2),
  bareCard('p7', 3, 3, 3),
];

const opponentDeck: ICard[] = [
  bareCard('o0', 1, 1, 1),
  bareCard('o1', 2, 2, 1),
  bareCard('o2', 2, 3, 2),
  bareCard('o3', 3, 3, 2),
  bareCard('o4', 4, 4, 3),
  bareCard('o5', 5, 5, 4),
  bareCard('o6', 1, 1, 1),
  bareCard('o7', 2, 2, 1),
];

function fresh() {
  // Pin equivalence snapshots to English. The production singleton
  // defaults to PT (matching I18nProvider); tests pin EN so snapshots
  // are stable against PT translation tweaks and align with the
  // legacy hardcoded copy this module historically pinned.
  return createGameStore({ clock: CLOCK, idGen: idGen(), getLang: () => 'en' });
}

/** Strip Zustand's actions, keeping only IGameState fields. The
 *  closure-captured action functions don't survive snapshot
 *  serialization meaningfully and aren't part of the contract. */
function snapshotState(state: IGameState): IGameState {
  return {
    player: state.player,
    opponent: state.opponent,
    turn: state.turn,
    gameLog: state.gameLog,
    winner: state.winner,
    turnNumber: state.turnNumber,
    generation: state.generation,
    initialized: state.initialized,
  };
}

describe('store equivalence — initGame', () => {
  it('snapshot: fresh init lands at turn 1, player to move, 5 cards in hand', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });
});

describe('store equivalence — single play', () => {
  it('snapshot: play a 1-cost creature spends mana, adds it sick to battlefield', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    store.getState().playCardToField('player', cardId('p0'));
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });

  it('snapshot: trying to play a card costing more than available mana is a no-op log entry', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    // p3 costs 3, player has 1 mana on turn 1.
    store.getState().playCardToField('player', cardId('p3'));
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });
});

describe('store equivalence — turn cycle', () => {
  it('snapshot: end-turn passes to opponent, turn counter does NOT bump until opponent ends', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    store.getState().endTurn();
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });

  it('snapshot: full cycle (player-end, opponent-end) lands on turn 2 player', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    store.getState().endTurn();
    store.getState().endTurn();
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });
});

describe('store equivalence — combat', () => {
  it('snapshot: attacker with summoning sickness cannot attack — log entry only, no state change', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    store.getState().playCardToField('player', cardId('p0'));
    store.getState().attack(cardId('p0'), null);
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });

  it('snapshot: attacker without sickness, no opponent creatures, hits face for power', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    store.getState().playCardToField('player', cardId('p1'));
    // pass through opponent turn so summoning sickness clears
    store.getState().endTurn();
    store.getState().endTurn();
    // p1 is power 2 — opponent should drop from 20 to 18.
    store.getState().attack(cardId('p1'), null);
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });

  it('snapshot: attacker with creatures present cannot attack face', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    store.getState().playCardToField('player', cardId('p1'));
    store.getState().endTurn();
    // Opponent's turn — they will play o0 via direct setState because
    // we want this test to be hermetic from useAIOrchestrator.
    const s = store.getState();
    const oppCard = s.opponent.hand[0]!;
    store.setState({
      opponent: { ...s.opponent, battlefield: [{ ...oppCard, summoningSick: false }] },
    });
    store.getState().endTurn();
    // Now player's turn 2 with a creature on opponent side.
    store.getState().attack(cardId('p1'), null);
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });
});

describe('store equivalence — winner detection', () => {
  it('snapshot: lethal attack to face flips winner=player and emits game-over log', () => {
    const store = fresh();
    store.getState().initGame(playerDeck, opponentDeck);
    // Inject a state where the player has a 99-power creature ready
    // to swing and the opponent is at 1 life.
    const s = store.getState();
    const big: ICard = { ...bareCard('lethal', 99, 99, 1), summoningSick: false };
    store.setState({
      player: { ...s.player, battlefield: [big] },
      opponent: { ...s.opponent, life: 1 },
    });
    store.getState().attack(big.id, null);
    expect(snapshotState(store.getState())).toMatchSnapshot();
  });
});
