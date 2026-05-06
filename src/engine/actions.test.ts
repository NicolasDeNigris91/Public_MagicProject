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

  it('blocker selection picks the *named* defender, not the first creature on the field', () => {
    // Three blockers; we target the middle one. If the find lookup
    // collapsed to "first match" the wrong card would die and the
    // others would survive — a subtle bug Stryker catches via the
    // `(c) => true` mutation on the find predicate.
    const att = bareCard('atk', { power: 3, toughness: 3 });
    const b1 = bareCard('b1', { power: 1, toughness: 1 });
    const b2 = bareCard('b2', { power: 1, toughness: 1 });
    const b3 = bareCard('b3', { power: 1, toughness: 1 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [att] }),
      opponent: emptyPlayer('opponent', { battlefield: [b1, b2, b3] }),
    });
    const r = executeAttack(s, att.id, b2.id);
    const remaining = r.next.opponent.battlefield.map((c) => c.id);
    expect(remaining).toEqual([b1.id, b3.id]);
  });

  it('player face attack announcer says "You attacked" + "Opponent\'s life is now N"', () => {
    const att = bareCard('p-att', { power: 4 });
    const s = state({ player: emptyPlayer('player', { battlefield: [att] }) });
    const r = executeAttack(s, att.id, null);
    expect(r.logs[0]?.message).toMatch(/^You attacked with /);
    expect(r.logs[0]?.message).toMatch(/Opponent's life is now 16/);
    expect(r.logs[0]?.meta?.attackingSide).toBe('player');
    expect(r.logs[0]?.meta?.damage).toBe(4);
  });

  it('opponent face attack announcer says "Opponent attacked" + "Your life is now N"', () => {
    const att = bareCard('o-att', { power: 5 });
    const s = state({
      turn: 'opponent',
      opponent: emptyPlayer('opponent', { battlefield: [att] }),
    });
    const r = executeAttack(s, att.id, null);
    expect(r.logs[0]?.message).toMatch(/^Opponent attacked with /);
    expect(r.logs[0]?.message).toMatch(/Your life is now 15/);
    expect(r.logs[0]?.meta?.attackingSide).toBe('opponent');
  });

  it('blocked-combat announcer surfaces both creature names + both "{name} dies" suffixes', () => {
    // Names chosen so neither is a substring of the other; otherwise the
    // negative match in the only-blocker-dies test below would be ambiguous.
    const att = bareCard('a', { name: 'Atticus', power: 2, toughness: 2 });
    const blk = bareCard('b', { name: 'Bramblefolk', power: 2, toughness: 2 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [att] }),
      opponent: emptyPlayer('opponent', { battlefield: [blk] }),
    });
    const r = executeAttack(s, att.id, blk.id);
    expect(r.logs[0]?.message).toContain('Atticus dies');
    expect(r.logs[0]?.message).toContain('Bramblefolk dies');
    expect(r.logs[0]?.meta?.attackerDies).toBe(1);
    expect(r.logs[0]?.meta?.blockerDies).toBe(1);
  });

  it('blocked-combat with only blocker dying omits the "{attacker} dies" sentence', () => {
    const att = bareCard('a', { name: 'Atticus', power: 5, toughness: 5 });
    const blk = bareCard('b', { name: 'Bramblefolk', power: 1, toughness: 1 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [att] }),
      opponent: emptyPlayer('opponent', { battlefield: [blk] }),
    });
    const r = executeAttack(s, att.id, blk.id);
    expect(r.logs[0]?.message).toContain('Bramblefolk dies');
    expect(r.logs[0]?.message).not.toContain('Atticus dies');
    expect(r.logs[0]?.meta?.attackerDies).toBe(0);
    expect(r.logs[0]?.meta?.blockerDies).toBe(1);
  });

  it('non-lethal face attack leaves winner null and emits exactly one combat log', () => {
    const att = bareCard('p7', { power: 2 });
    const s = state({ player: emptyPlayer('player', { battlefield: [att] }) });
    const r = executeAttack(s, att.id, null);
    expect(r.next.winner).toBeNull();
    expect(r.logs).toHaveLength(1);
    expect(r.logs[0]?.kind).toBe('combat');
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
    expect(r.logs[0]?.meta?.winner).toBe('opponent');
    expect(r.logs[0]?.message).toMatch(/You tried to draw from an empty deck/);
    expect(r.logs[0]?.message).toMatch(/lose the match/);
    expect(r.logs[0]?.priority).toBe('assertive');
  });

  it('decking-out opponent flips winner=player and emits the win-side game-over copy', () => {
    const s = state({ opponent: emptyPlayer('opponent', { deck: [] }) });
    const r = executeDrawCard(s, 'opponent');
    expect(r.next.winner).toBe('player');
    expect(r.logs[0]?.kind).toBe('game-over');
    expect(r.logs[0]?.meta?.reason).toBe('decking');
    expect(r.logs[0]?.meta?.winner).toBe('player');
    expect(r.logs[0]?.message).toMatch(/Opponent tried to draw from an empty deck/);
    expect(r.logs[0]?.message).toMatch(/win the match/);
    expect(r.logs[0]?.priority).toBe('assertive');
  });

  it('successful draw from PLAYER side emits a "You drew" log + transfers card to hand', () => {
    const card = bareCard('drawme');
    const s = state({ player: emptyPlayer('player', { deck: [card] }) });
    const r = executeDrawCard(s, 'player');
    expect(r.next.player.hand).toContainEqual(card);
    expect(r.next.player.deck).toEqual([]);
    expect(r.logs[0]?.kind).toBe('draw');
    expect(r.logs[0]?.message).toMatch(/^You drew /);
  });

  it('successful draw from OPPONENT side emits an "Opponent drew" log without leaking the card name', () => {
    const card = bareCard('hidden');
    const s = state({ opponent: emptyPlayer('opponent', { deck: [card] }) });
    const r = executeDrawCard(s, 'opponent');
    expect(r.next.opponent.hand).toContainEqual(card);
    expect(r.logs[0]?.kind).toBe('draw');
    expect(r.logs[0]?.message).toMatch(/^Opponent drew/);
    // The opponent's draw must not surface the card's name (hidden info).
    expect(r.logs[0]?.message).not.toContain(card.name);
  });
});

describe('executePlayCardToField', () => {
  it('no-op when winner is already set', () => {
    const card = bareCard('p0');
    const s = state({
      winner: 'opponent',
      player: emptyPlayer('player', { hand: [card], manaAvailable: 2 }),
    });
    const r = executePlayCardToField(s, 'player', card.id);
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

  it('no-op when the requested cardId is not in the player hand', () => {
    const real = bareCard('real');
    const s = state({
      player: emptyPlayer('player', { hand: [real], manaAvailable: 2 }),
    });
    const r = executePlayCardToField(s, 'player', cardId('ghost'));
    expect(r.next).toBe(s);
    expect(r.logs).toEqual([]);
  });

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

  it('successful play from PLAYER side emits "You played" log + summoningSick=true on the entered card', () => {
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
    expect(r.logs[0]?.message).toMatch(/^You played /);
    expect(r.logs[0]?.message).toMatch(/summoning sickness/);
    expect(r.logs[0]?.meta?.player).toBe('player');
  });

  it('successful play from OPPONENT side emits "Opponent played" log with player meta=opponent', () => {
    const card = bareCard('o-p', { cmc: 1 });
    const s = state({
      turn: 'opponent',
      opponent: emptyPlayer('opponent', { hand: [card], manaAvailable: 2 }),
    });
    const r = executePlayCardToField(s, 'opponent', card.id);
    expect(r.next.opponent.battlefield).toHaveLength(1);
    expect(r.logs[0]?.kind).toBe('play');
    expect(r.logs[0]?.message).toMatch(/^Opponent played /);
    expect(r.logs[0]?.message).toMatch(/summoning sickness/);
    expect(r.logs[0]?.meta?.player).toBe('opponent');
  });
});

/**
 * Multi-step compositions the single-call describes can't reach: state
 * threads through 2-3 actions in a row. These pin sequences a real
 * player drives in one turn, so a regression in one step that only
 * surfaces on the next still gets caught.
 */
describe('cross-cutting sequences', () => {
  it('two-attacker turn: blocker dies on first swing, second attacker hits face same turn', () => {
    const a1 = bareCard('p-a1', { power: 5, toughness: 5 });
    const a2 = bareCard('p-a2', { power: 3, toughness: 3 });
    const blocker = bareCard('o-b', { power: 1, toughness: 1 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [a1, a2] }),
      opponent: emptyPlayer('opponent', { battlefield: [blocker] }),
    });

    const r1 = executeAttack(s, a1.id, blocker.id);
    expect(r1.next.opponent.battlefield).toEqual([]);
    expect(r1.next.player.battlefield.find((c) => c.id === a1.id)?.attackedThisTurn).toBe(true);
    expect(r1.next.player.battlefield.find((c) => c.id === a2.id)?.attackedThisTurn).toBeFalsy();

    // With the defender empty, a2 can now legally swing face.
    const r2 = executeAttack(r1.next, a2.id, null);
    expect(r2.next.opponent.life).toBe(17);
    expect(r2.next.player.battlefield.find((c) => c.id === a2.id)?.attackedThisTurn).toBe(true);
  });

  it('multi-play same turn: three plays drain mana to zero, all enter with summoning sickness', () => {
    const c1 = bareCard('p1', { cmc: 1 });
    const c2 = bareCard('p2', { cmc: 1 });
    const c3 = bareCard('p3', { cmc: 1 });
    const s = state({
      player: emptyPlayer('player', {
        hand: [c1, c2, c3],
        manaAvailable: 3,
        manaMax: 3,
      }),
    });
    const r1 = executePlayCardToField(s, 'player', c1.id);
    const r2 = executePlayCardToField(r1.next, 'player', c2.id);
    const r3 = executePlayCardToField(r2.next, 'player', c3.id);

    expect(r3.next.player.hand).toEqual([]);
    expect(r3.next.player.battlefield).toHaveLength(3);
    expect(r3.next.player.manaAvailable).toBe(0);
    expect(r3.next.player.battlefield.every((c) => c.summoningSick === true)).toBe(true);
  });

  it('round-trip summoning sickness: play, end-turn twice, the same creature can now attack', () => {
    const card = bareCard('p1', { power: 3 });
    const drawO = bareCard('o-draw');
    const drawP = bareCard('p-draw');
    const s = state({
      player: emptyPlayer('player', {
        hand: [card],
        manaAvailable: 1,
        manaMax: 1,
        deck: [drawP],
      }),
      opponent: emptyPlayer('opponent', { manaMax: 1, deck: [drawO] }),
    });
    const r1 = executePlayCardToField(s, 'player', card.id);
    expect(r1.next.player.battlefield[0]?.summoningSick).toBe(true);

    const r2 = executeEndTurn(r1.next);
    expect(r2.next.turn).toBe('opponent');

    const r3 = executeEndTurn(r2.next);
    expect(r3.next.turn).toBe('player');
    expect(r3.next.turnNumber).toBe(2);
    expect(r3.next.player.battlefield[0]?.summoningSick).toBe(false);

    const r4 = executeAttack(r3.next, card.id, null);
    expect(r4.next.opponent.life).toBe(17);
    expect(r4.next.player.battlefield[0]?.attackedThisTurn).toBe(true);
  });

  it('post-decking cascade: once decking flips winner, a follow-up attack is a silent no-op', () => {
    const s = state({ player: emptyPlayer('player', { deck: [] }) });
    const r1 = executeDrawCard(s, 'player');
    expect(r1.next.winner).toBe('opponent');

    const att = bareCard('post-deck-att');
    const withAttacker: IGameState = {
      ...r1.next,
      player: { ...r1.next.player, battlefield: [att] },
    };
    const r2 = executeAttack(withAttacker, att.id, null);
    expect(r2.next).toBe(withAttacker);
    expect(r2.logs).toEqual([]);
  });

  it('post-lethal cascade: end-turn after a lethal attack is a silent no-op', () => {
    const big = bareCard('finisher', { power: 99 });
    const s = state({
      player: emptyPlayer('player', { battlefield: [big] }),
      opponent: emptyPlayer('opponent', { life: 1 }),
    });
    const r1 = executeAttack(s, big.id, null);
    expect(r1.next.winner).toBe('player');

    const r2 = executeEndTurn(r1.next);
    expect(r2.next).toBe(r1.next);
    expect(r2.logs).toEqual([]);
  });

  it('play-then-attack same turn: fresh play keeps summoningSick, an existing creature swings unimpaired', () => {
    const fresh = bareCard('fresh');
    const veteran = bareCard('vet', { power: 4 });
    const s = state({
      player: emptyPlayer('player', {
        hand: [fresh],
        battlefield: [veteran],
        manaAvailable: 2,
        manaMax: 2,
      }),
    });
    const r1 = executePlayCardToField(s, 'player', fresh.id);
    expect(r1.next.player.battlefield).toHaveLength(2);

    const r2 = executeAttack(r1.next, veteran.id, null);
    expect(r2.next.opponent.life).toBe(16);
    expect(r2.next.player.battlefield.find((c) => c.id === fresh.id)?.summoningSick).toBe(true);
    expect(r2.next.player.battlefield.find((c) => c.id === veteran.id)?.attackedThisTurn).toBe(
      true,
    );
    // The freshly played card never got attackedThisTurn flipped — only the veteran did.
    expect(r2.next.player.battlefield.find((c) => c.id === fresh.id)?.attackedThisTurn).toBeFalsy();
  });
});
