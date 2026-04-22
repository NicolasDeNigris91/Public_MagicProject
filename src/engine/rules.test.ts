import { describe, expect, it } from 'vitest';
import type { ICard, IPlayer } from './types';
import {
  applyDamage, beginTurn, canAfford, canAttack, canAttackFace,
  drawCard, playCardToField, resolveCombat,
} from './rules';

const makeCard = (id: string, power = 2, toughness = 2): ICard => ({
  id, name: `Card ${id}`, power, toughness, cmc: 0,
  manaCost: '{1}', typeLine: 'Creature', oracleText: '',
  imageUrl: '', imageUrlSmall: '', accessibilityDescription: `Card ${id}`,
});

const makePlayer = (overrides: Partial<IPlayer> = {}): IPlayer => ({
  id: 'player', life: 20, hand: [], battlefield: [], deck: [],
  manaMax: 0, manaAvailable: 0, ...overrides,
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

  it('is a no-op when card not in hand', () => {
    const p = makePlayer();
    expect(playCardToField(p, 'ghost')).toEqual(p);
  });

  it('decrements manaAvailable by card.cmc', () => {
    const c = { ...makeCard('a'), cmc: 3 };
    const p = makePlayer({ hand: [c], manaAvailable: 5, manaMax: 5 });
    expect(playCardToField(p, 'a').manaAvailable).toBe(2);
  });

  it('treats free (cmc 0) cards as costing zero mana', () => {
    const c = { ...makeCard('a'), cmc: 0 };
    const p = makePlayer({ hand: [c], manaAvailable: 0 });
    expect(playCardToField(p, 'a').manaAvailable).toBe(0);
  });

  it('clamps manaAvailable at 0 when cmc exceeds mana (defensive; callers should gate with canAfford)', () => {
    const c = { ...makeCard('a'), cmc: 5 };
    const p = makePlayer({ hand: [c], manaAvailable: 1 });
    expect(playCardToField(p, 'a').manaAvailable).toBe(0);
  });

  it('allows chaining multiple plays in the same turn (no per-turn cap)', () => {
    const a = { ...makeCard('a'), cmc: 1 };
    const b = { ...makeCard('b'), cmc: 1 };
    let p = makePlayer({ hand: [a, b], manaAvailable: 2, manaMax: 2 });
    p = playCardToField(p, 'a');
    p = playCardToField(p, 'b');
    expect(p.battlefield).toHaveLength(2);
    expect(p.manaAvailable).toBe(0);
  });
});

describe('canAttack', () => {
  it('blocks attacks for summoning-sick creatures', () => {
    expect(canAttack({ ...makeCard('a'), summoningSick: true })).toBe(false);
    expect(canAttack(makeCard('a'))).toBe(true);
  });

  it('blocks attacks for creatures that already attacked this turn', () => {
    expect(canAttack({ ...makeCard('a'), attackedThisTurn: true })).toBe(false);
  });
});

describe('canAfford', () => {
  it('returns true when manaAvailable >= card.cmc', () => {
    const card = { ...makeCard('a'), cmc: 3 };
    const player = makePlayer({ manaAvailable: 3 });
    expect(canAfford(player, card)).toBe(true);
  });

  it('returns false when manaAvailable < card.cmc', () => {
    const card = { ...makeCard('a'), cmc: 4 };
    const player = makePlayer({ manaAvailable: 3 });
    expect(canAfford(player, card)).toBe(false);
  });

  it('treats cmc 0 as always affordable', () => {
    const card = { ...makeCard('a'), cmc: 0 };
    expect(canAfford(makePlayer({ manaAvailable: 0 }), card)).toBe(true);
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
  it('clears summoning sickness on the player\'s creatures', () => {
    const p = makePlayer({
      battlefield: [{ ...makeCard('a'), summoningSick: true }, makeCard('b')],
    });
    const after = beginTurn(p);
    expect(after.battlefield.every((c) => !c.summoningSick)).toBe(true);
  });

  it('clears attackedThisTurn so creatures can attack again', () => {
    const p = makePlayer({
      battlefield: [{ ...makeCard('a'), attackedThisTurn: true }],
    });
    const after = beginTurn(p);
    expect(after.battlefield.every((c) => !c.attackedThisTurn)).toBe(true);
  });

  it('ramps manaMax by 1 and refills manaAvailable', () => {
    const p = makePlayer({ manaMax: 2, manaAvailable: 0 });
    const after = beginTurn(p);
    expect(after.manaMax).toBe(3);
    expect(after.manaAvailable).toBe(3);
  });

  it('discards leftover manaAvailable from previous turn', () => {
    // Player ended last turn with 1 mana unspent; new turn refills, no carry.
    const p = makePlayer({ manaMax: 2, manaAvailable: 1 });
    const after = beginTurn(p);
    expect(after.manaAvailable).toBe(after.manaMax);
  });

  it('first beginTurn from manaMax 0 yields 1 / 1', () => {
    const p = makePlayer({ manaMax: 0, manaAvailable: 0 });
    const after = beginTurn(p);
    expect(after.manaMax).toBe(1);
    expect(after.manaAvailable).toBe(1);
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
