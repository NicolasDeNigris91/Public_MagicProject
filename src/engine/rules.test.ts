import { describe, expect, it } from 'vitest';
import type { ICard, IPlayer } from './types';
import {
  PLAYS_PER_TURN, applyDamage, beginTurn, canAttack, canAttackFace, canPlay,
  drawCard, playCardToField, resolveCombat,
} from './rules';

const makeCard = (id: string, power = 2, toughness = 2): ICard => ({
  id, name: `Card ${id}`, power, toughness,
  manaCost: '{1}', typeLine: 'Creature', oracleText: '',
  imageUrl: '', imageUrlSmall: '', accessibilityDescription: `Card ${id}`,
});

const makePlayer = (overrides: Partial<IPlayer> = {}): IPlayer => ({
  id: 'player', life: 20, hand: [], battlefield: [], deck: [],
  playsRemaining: PLAYS_PER_TURN, ...overrides,
});

describe('drawCard', () => {
  it('moves top of deck to hand', () => {
    const c = makeCard('a');
    const p = makePlayer({ deck: [c] });
    const { player, drawn } = drawCard(p);
    expect(drawn?.id).toBe('a');
    expect(player.hand).toHaveLength(1);
    expect(player.deck).toHaveLength(0);
  });

  it('returns null when deck empty', () => {
    const { drawn } = drawCard(makePlayer());
    expect(drawn).toBeNull();
  });
});

describe('playCardToField', () => {
  it('moves card from hand to battlefield with summoning sickness', () => {
    const c = makeCard('a');
    const p = makePlayer({ hand: [c] });
    const result = playCardToField(p, 'a');
    expect(result.hand).toHaveLength(0);
    expect(result.battlefield).toHaveLength(1);
    expect(result.battlefield[0]?.summoningSick).toBe(true);
  });

  it('decrements playsRemaining', () => {
    const p = makePlayer({ hand: [makeCard('a')], playsRemaining: 1 });
    expect(playCardToField(p, 'a').playsRemaining).toBe(0);
  });

  it('is a no-op when card not in hand', () => {
    const p = makePlayer();
    expect(playCardToField(p, 'ghost')).toEqual(p);
  });
});

describe('canPlay / canAttack', () => {
  it('blocks plays when playsRemaining is zero', () => {
    expect(canPlay(makePlayer({ playsRemaining: 0 }))).toBe(false);
    expect(canPlay(makePlayer({ playsRemaining: 1 }))).toBe(true);
  });

  it('blocks attacks for summoning-sick creatures', () => {
    expect(canAttack({ ...makeCard('a'), summoningSick: true })).toBe(false);
    expect(canAttack(makeCard('a'))).toBe(true);
  });

  it('blocks attacks for creatures that already attacked this turn', () => {
    expect(canAttack({ ...makeCard('a'), attackedThisTurn: true })).toBe(false);
  });
});

describe('canAttackFace', () => {
  it('allows face damage when defender has no creatures', () => {
    expect(canAttackFace(makePlayer())).toBe(true);
  });

  it('blocks face damage when defender has any creature', () => {
    expect(canAttackFace(makePlayer({ battlefield: [makeCard('wall')] }))).toBe(false);
  });
});

describe('beginTurn', () => {
  it('clears summoning sickness and refills plays', () => {
    const p = makePlayer({
      playsRemaining: 0,
      battlefield: [{ ...makeCard('a'), summoningSick: true }, makeCard('b')],
    });
    const after = beginTurn(p);
    expect(after.playsRemaining).toBe(PLAYS_PER_TURN);
    expect(after.battlefield.every((c) => !c.summoningSick)).toBe(true);
  });

  it('clears attackedThisTurn so creatures can attack again', () => {
    const p = makePlayer({
      battlefield: [{ ...makeCard('a'), attackedThisTurn: true }],
    });
    const after = beginTurn(p);
    expect(after.battlefield.every((c) => !c.attackedThisTurn)).toBe(true);
  });
});

describe('resolveCombat', () => {
  it('unblocked: attacker hits player', () => {
    const r = resolveCombat(makeCard('a', 3, 3), null);
    expect(r.playerDamage).toBe(3);
    expect(r.attackerDies).toBe(false);
  });

  it('mutual kill when power equals opposing toughness', () => {
    const r = resolveCombat(makeCard('a', 2, 2), makeCard('b', 2, 2));
    expect(r.attackerDies).toBe(true);
    expect(r.blockerDies).toBe(true);
  });

  it('large attacker vs small blocker: only blocker dies', () => {
    const r = resolveCombat(makeCard('a', 5, 5), makeCard('b', 1, 1));
    expect(r.blockerDies).toBe(true);
    expect(r.attackerDies).toBe(false);
  });
});

describe('applyDamage', () => {
  it('clamps life at zero', () => {
    expect(applyDamage(makePlayer({ life: 3 }), 10).life).toBe(0);
  });
});
