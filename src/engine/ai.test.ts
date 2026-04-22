import { describe, expect, it } from 'vitest';
import type { ICard, IPlayer } from './types';
import { pickCardToPlay, planAttacks } from './ai';

const makeCard = (id: string, power = 2, toughness = 2, typeLine = 'Creature'): ICard => ({
  id, name: id, power, toughness, cmc: 0, manaCost: '{1}', typeLine,
  oracleText: '', imageUrl: '', imageUrlSmall: '', accessibilityDescription: id,
});

const makePlayer = (o: Partial<IPlayer> = {}): IPlayer => ({
  id: 'opponent', life: 20, hand: [], battlefield: [], deck: [],
  playsRemaining: 1, ...o,
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
});
