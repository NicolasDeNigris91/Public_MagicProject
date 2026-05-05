import { describe, expect, it } from 'vitest';
import { executeAttack, executeDrawCard, executeEndTurn, executePlayCardToField } from './actions';
import { cardId } from './types';
import type { ICard, IGameState, IPlayer } from './types';

/**
 * Pure-function tests for engine/actions.ts. These complement the
 * store-level equivalence snapshots by hitting branches directly:
 * no Zustand instance, no Clock, no IdGen — just call the function
 * with a state fixture and assert on `next` + `logs`.
 *
 * State fixtures are minimal: the smallest IGameState that exercises
 * the branch under test. No deck draws, no mana ramp, no live
 * announcer.
 */

function bareCard(id: string, opts: Partial<ICard> = {}): ICard {
  return {
    id: cardId(id),
    name: id.toUpperCase(),
    power: 2,
    toughness: 2,
    cmc: 1,
    color: 'R',
    manaCost: '{R}',
    typeLine: 'Creature',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: id.toUpperCase(),
    ...opts,
  };
}

function emptyPlayer(id: 'player' | 'opponent', overrides: Partial<IPlayer> = {}): IPlayer {
  return {
    id,
    life: 20,
    hand: [],
    battlefield: [],
    deck: [],
    manaMax: 1,
    manaAvailable: 1,
    ...overrides,
  };
}

function state(overrides: Partial<IGameState> = {}): IGameState {
  return {
    player: emptyPlayer('player'),
    opponent: emptyPlayer('opponent'),
    turn: 'player',
    gameLog: [],
    winner: null,
    turnNumber: 1,
    generation: 1,
    initialized: true,
    ...overrides,
  };
}

describe('executeAttack — early-out branches', () => {
  it('no-op when winner is already set (game over)', () => {
    const s = state({ winner: 'player' });
    const r = executeAttack(s, cardId('whatever'), null);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('no-op when attackerId is not on the attacking battlefield', () => {
    const s = state();
    const r = executeAttack(s, cardId('ghost'), null);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('summoning-sick attack from PLAYER side emits a polite info log, no state change', () => {
    const sick = bareCard('p1', { summoningSick: true });
    const s = state({ player: emptyPlayer('player', { battlefield: [sick] }) });
    const r = executeAttack(s, sick.id, null);
    expect(r.next).toBe(s);
    expect(r.logs).toHaveLength(1);
    expect(r.logs[0]?.message).toMatch(/summoning sickness/);
    expect(r.logs[0]?.priority).toBe('polite');
    expect(r.logs[0]?.kind).toBe('info');
  });

  it('summoning-sick attack from OPPONENT side is silent (no log)', () => {
    const sick = bareCard('o1', { summoningSick: true });
    const s = state({
      turn: 'opponent',
      opponent: emptyPlayer('opponent', { battlefield: [sick] }),
    });
    const r = executeAttack(s, sick.id, null);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('already-attacked-this-turn attempt: PLAYER gets the "has already attacked" log', () => {
    const exhausted = bareCard('p2', { attackedThisTurn: true });
    const s = state({ player: emptyPlayer('player', { battlefield: [exhausted] }) });
    const r = executeAttack(s, exhausted.id, null);
    expect(r.logs[0]?.message).toMatch(/has already attacked this turn/);
  });

  it('face attack with creatures present: PLAYER gets the "cannot attack directly" log', () => {
    const att = bareCard('p3');
    const blocker = bareCard('o3');
    const s = state({
      player: emptyPlayer('player', { battlefield: [att] }),
      opponent: emptyPlayer('opponent', { battlefield: [blocker] }),
    });
    const r = executeAttack(s, att.id, null);
    expect(r.next).toBe(s);
    expect(r.logs[0]?.message).toMatch(/Cannot attack directly/);
  });
});

describe('executeAttack — combat resolution', () => {
  it('face attack with empty defender battlefield deals power damage and emits combat log', () => {
    const att = bareCard('p4', { power: 3 });
    const s = state({ player: emptyPlayer('player', { battlefield: [att] }) });
    const r = executeAttack(s, att.id, null);
    expect(r.next.opponent.life).toBe(17);
    expect(r.next.player.battlefield[0]?.attackedThisTurn).toBe(true);
    expect(r.logs[0]?.kind).toBe('combat');
    expect(r.logs[0]?.priority).toBe('assertive');
  });

  it('lethal face attack flips winner=player and appends the game-over log', () => {
    const big = bareCard('lethal', { power: 99 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [big] }),
      opponent: emptyPlayer('opponent', { life: 1 }),
    });
    const r = executeAttack(s, big.id, null);
    expect(r.next.winner).toBe('player');
    expect(r.next.opponent.life).toBe(0);
    expect(r.logs).toHaveLength(2);
    expect(r.logs[1]?.kind).toBe('game-over');
    expect(r.logs[1]?.message).toMatch(/Victory/);
  });

  it('lethal face attack from OPPONENT side emits the "Defeat" copy', () => {
    const big = bareCard('opp-lethal', { power: 99 });
    const s = state({
      turn: 'opponent',
      opponent: emptyPlayer('opponent', { battlefield: [big] }),
      player: emptyPlayer('player', { life: 1 }),
    });
    const r = executeAttack(s, big.id, null);
    expect(r.next.winner).toBe('opponent');
    expect(r.next.player.life).toBe(0);
    expect(r.logs[1]?.message).toMatch(/Defeat/);
    expect(r.logs[1]?.message).toMatch(/zero/);
  });

  it('blocked attack where both die removes both creatures, no face damage', () => {
    const att = bareCard('p5', { power: 3, toughness: 3 });
    const blocker = bareCard('o5', { power: 3, toughness: 3 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [att] }),
      opponent: emptyPlayer('opponent', { battlefield: [blocker] }),
    });
    const r = executeAttack(s, att.id, blocker.id);
    expect(r.next.player.battlefield).toEqual([]);
    expect(r.next.opponent.battlefield).toEqual([]);
    expect(r.next.opponent.life).toBe(20);
    expect(r.logs[0]?.message).toMatch(/blocked by/);
    expect(r.logs[0]?.message).toMatch(/dies/);
  });

  it('blocked attack where only the blocker dies: attacker survives + attackedThisTurn=true', () => {
    const att = bareCard('p6', { power: 5, toughness: 5 });
    const blocker = bareCard('o6', { power: 1, toughness: 1 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [att] }),
      opponent: emptyPlayer('opponent', { battlefield: [blocker] }),
    });
    const r = executeAttack(s, att.id, blocker.id);
    expect(r.next.player.battlefield).toHaveLength(1);
    expect(r.next.player.battlefield[0]?.attackedThisTurn).toBe(true);
    expect(r.next.opponent.battlefield).toEqual([]);
  });
});

describe('executeEndTurn', () => {
  it('no-op when winner is already set', () => {
    const s = state({ winner: 'opponent' });
    const r = executeEndTurn(s);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('player -> opponent: turn does NOT bump until opponent ends', () => {
    const s = state({ turn: 'player', turnNumber: 1 });
    const r = executeEndTurn(s);
    expect(r.next.turn).toBe('opponent');
    expect(r.next.turnNumber).toBe(1);
    // Opponent ramped to manaMax=1, then drew (deck empty -> decking-out).
    // Decking-out flips winner=player and emits game-over.
    expect(r.next.winner).toBe('player');
  });

  it('opponent -> player: turn bumps, mana log emitted, draw chained', () => {
    const newCard = bareCard('drawn');
    const s = state({
      turn: 'opponent',
      turnNumber: 1,
      player: emptyPlayer('player', { manaMax: 1, deck: [newCard] }),
    });
    const r = executeEndTurn(s);
    expect(r.next.turn).toBe('player');
    expect(r.next.turnNumber).toBe(2);
    expect(r.next.player.manaMax).toBe(2);
    expect(r.next.player.hand).toContainEqual(newCard);
    // turn log + mana log + draw log = 3
    expect(r.logs).toHaveLength(3);
    expect(r.logs[1]?.kind).toBe('mana');
  });
});

describe('executeDrawCard', () => {
  it('no-op when winner is already set', () => {
    const s = state({ winner: 'player' });
    const r = executeDrawCard(s, 'opponent');
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('decking-out player flips winner=opponent and emits game-over with reason=decking', () => {
    const s = state({ player: emptyPlayer('player', { deck: [] }) });
    const r = executeDrawCard(s, 'player');
    expect(r.next.winner).toBe('opponent');
    expect(r.logs[0]?.kind).toBe('game-over');
    expect(r.logs[0]?.meta?.reason).toBe('decking');
  });
});

describe('executePlayCardToField', () => {
  it("no-op when not the requested side's turn", () => {
    const card = bareCard('p1');
    const s = state({
      turn: 'opponent',
      player: emptyPlayer('player', { hand: [card] }),
    });
    const r = executePlayCardToField(s, 'player', card.id);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('over-cost from PLAYER side emits an info log (no state change)', () => {
    const card = bareCard('p2', { cmc: 5 });
    const s = state({
      player: emptyPlayer('player', { hand: [card], manaAvailable: 1 }),
    });
    const r = executePlayCardToField(s, 'player', card.id);
    expect(r.next).toBe(s);
    expect(r.logs[0]?.message).toMatch(/Cannot play/);
  });

  it('over-cost from OPPONENT side is silent (no log)', () => {
    const card = bareCard('o1', { cmc: 5 });
    const s = state({
      turn: 'opponent',
      opponent: emptyPlayer('opponent', { hand: [card], manaAvailable: 1 }),
    });
    const r = executePlayCardToField(s, 'opponent', card.id);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('successful play moves the card to battlefield with summoningSick=true', () => {
    const card = bareCard('p3');
    const s = state({
      player: emptyPlayer('player', { hand: [card], manaAvailable: 2 }),
    });
    const r = executePlayCardToField(s, 'player', card.id);
    expect(r.next.player.hand).toEqual([]);
    expect(r.next.player.battlefield).toHaveLength(1);
    expect(r.next.player.battlefield[0]?.summoningSick).toBe(true);
    expect(r.next.player.manaAvailable).toBe(1);
    expect(r.logs[0]?.kind).toBe('play');
  });
});
