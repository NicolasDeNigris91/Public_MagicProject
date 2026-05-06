import { describe, expect, it } from 'vitest';
import { pickCardToPlay, planAttacks } from './ai';
import { cardId } from './types';
import type { ICard, IPlayer } from './types';

const makeCard = (id: string, power = 2, toughness = 2, typeLine = 'Creature'): ICard => ({
  id: cardId(id),
  name: id,
  power,
  toughness,
  cmc: 0,
  manaCost: '{1}',
  typeLine,
  oracleText: '',
  imageUrl: '',
  imageUrlSmall: '',
  accessibilityDescription: id,
});

const makePlayer = (o: Partial<IPlayer> = {}): IPlayer => ({
  id: 'opponent',
  life: 20,
  hand: [],
  battlefield: [],
  deck: [],
  manaMax: 0,
  manaAvailable: 0,
  ...o,
});

describe('pickCardToPlay', () => {
  it('picks highest-power creature when all are affordable', () => {
    const hand = [makeCard('a', 1, 1), makeCard('b', 4, 2), makeCard('c', 2, 2)];
    expect(pickCardToPlay(hand, Infinity)?.id).toBe('b');
  });

  it('ignores non-creatures', () => {
    expect(pickCardToPlay([makeCard('land', 0, 0, 'Land')], Infinity)).toBeNull();
  });

  it('returns null on empty hand', () => {
    expect(pickCardToPlay([], Infinity)).toBeNull();
  });

  it('skips creatures whose cmc exceeds manaAvailable', () => {
    const hand = [
      { ...makeCard('big', 5, 5), cmc: 5 },
      { ...makeCard('small', 2, 2), cmc: 2 },
    ];
    expect(pickCardToPlay(hand, 3)?.id).toBe('small');
  });

  it('returns null when no creature is affordable', () => {
    const hand = [{ ...makeCard('big', 5, 5), cmc: 5 }];
    expect(pickCardToPlay(hand, 2)).toBeNull();
  });

  it('treats cmc equal to manaAvailable as affordable', () => {
    const hand = [{ ...makeCard('exact', 3, 3), cmc: 3 }];
    expect(pickCardToPlay(hand, 3)?.id).toBe('exact');
  });
});

describe('planAttacks', () => {
  it('attacks directly when opponent has no blockers', () => {
    const me = makePlayer({ battlefield: [makeCard('a', 3, 3)] });
    const plans = planAttacks(me, makePlayer());
    expect(plans).toEqual([{ attackerId: 'a', blockerId: null }]);
  });

  it('picks a safe kill over direct attack', () => {
    const me = makePlayer({ battlefield: [makeCard('big', 5, 5)] });
    const opp = makePlayer({ battlefield: [makeCard('weak', 1, 1)] });
    const plans = planAttacks(me, opp);
    expect(plans[0]).toEqual({ attackerId: 'big', blockerId: 'weak' });
  });

  it('skips attacking into a bigger wall', () => {
    const me = makePlayer({ battlefield: [makeCard('small', 1, 1)] });
    const opp = makePlayer({ battlefield: [makeCard('wall', 0, 10)] });
    expect(planAttacks(me, opp)).toHaveLength(0);
  });

  it('never attacks face when defender has creatures, even with a huge attacker', () => {
    const me = makePlayer({ battlefield: [makeCard('huge', 10, 10)] });
    const opp = makePlayer({ battlefield: [makeCard('chump', 1, 1)] });
    const plans = planAttacks(me, opp);
    expect(plans.every((p) => p.blockerId !== null)).toBe(true);
  });

  it('takes a safe kill at the power=toughness boundary (>=, not >)', () => {
    // Attacker p=3 t=5 vs blocker p=3 t=3.
    // - filter `attacker.power >= b.toughness`: 3 >= 3 → true. Blocker dies.
    // - filter `b.power < attacker.toughness`: 3 < 5 → true. Attacker survives.
    // The `>` mutation would skip this kill (3 > 3 is false), leaving the
    // plan empty (face attack illegal with creatures still on the field).
    const me = makePlayer({ battlefield: [makeCard('atk', 3, 5)] });
    const opp = makePlayer({ battlefield: [makeCard('blk', 3, 3)] });
    expect(planAttacks(me, opp)).toEqual([{ attackerId: 'atk', blockerId: 'blk' }]);
  });

  it('refuses an even trade where attacker dies too (< not <=)', () => {
    // Attacker p=2 t=2, blocker p=2 t=2 — mutual kill in resolveCombat.
    // - filter `b.power < attacker.toughness`: 2 < 2 → false. NOT a safe kill.
    // The `<=` mutation would treat 2 <= 2 as a safe kill and trade into
    // the wall, losing the attacker for nothing. With the correct `<`, the
    // AI passes (no face attack with creatures present, no safe kill).
    const me = makePlayer({ battlefield: [makeCard('a', 2, 2)] });
    const opp = makePlayer({ battlefield: [makeCard('b', 2, 2)] });
    expect(planAttacks(me, opp)).toEqual([]);
  });

  it('targets the lowest-toughness safe-kill blocker, not the first match', () => {
    // Attacker p=5 t=5. Three valid safe-kill blockers, ordered by board
    // position so that the first-match heuristic (the failure case if the
    // sort is mutated to a no-op) would pick the WRONG one.
    const me = makePlayer({ battlefield: [makeCard('atk', 5, 5)] });
    const opp = makePlayer({
      battlefield: [
        makeCard('tough-4', 0, 4),
        makeCard('tough-1', 0, 1),
        makeCard('tough-3', 0, 3),
      ],
    });
    const plans = planAttacks(me, opp);
    expect(plans[0]?.blockerId).toBe('tough-1');
  });
});
