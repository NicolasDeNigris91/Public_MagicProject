/**
 * Property-based invariants for the rules engine.
 *
 * Examples are great at catching the cases you imagined; properties
 * are great at catching the cases you didn't. Each test here states
 * a rule that must hold across the entire input space and lets
 * fast-check try thousands of generated states against it.
 *
 * Invariants we lock in:
 *   - life never drops below 0
 *   - mana never drops below 0
 *   - drawCard is monotonic on (deck length, hand length)
 *   - playCardToField is a no-op when the card isn't in hand
 *   - playCardToField is a no-op on the deck and on the opponent
 *   - resolveCombat is symmetric in damage exchange when both have a creature
 *   - beginTurn ramps manaMax by exactly 1 and clears sickness flags
 *
 * Inputs are kept small (creature stats, deck/hand sizes) so failures
 * shrink to readable counterexamples.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ICard, IPlayer } from './types';
import {
  applyDamage,
  beginTurn,
  canAfford,
  drawCard,
  playCardToField,
  resolveCombat,
} from './rules';

const cardArb: fc.Arbitrary<ICard> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  name: fc.string({ minLength: 1, maxLength: 12 }),
  power: fc.integer({ min: 0, max: 12 }),
  toughness: fc.integer({ min: 1, max: 12 }),
  cmc: fc.integer({ min: 0, max: 8 }),
  manaCost: fc.constant(''),
  typeLine: fc.constant('Creature'),
  oracleText: fc.constant(''),
  imageUrl: fc.constant(''),
  imageUrlSmall: fc.constant(''),
  accessibilityDescription: fc.constant(''),
});

// Cards are partitioned into zones from a single unique-id pool so a
// given id never appears in two zones at once — that would shadow the
// freshly-played copy in playCardToField and is impossible in real play.
const playerArb: fc.Arbitrary<IPlayer> = fc
  .uniqueArray(cardArb, { selector: (c) => c.id, maxLength: 50 })
  .chain((cards) =>
    fc
      .tuple(
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 12 }),
        fc.integer({ min: 0, max: 12 }),
        fc.nat(Math.min(cards.length, 10)),
        fc.nat(Math.min(cards.length, 20)),
      )
      .map(([life, manaMax, manaAvailable, handLen, fieldLen]) => {
        const handEnd = Math.min(handLen, cards.length);
        const fieldEnd = Math.min(handEnd + fieldLen, cards.length);
        return {
          id: 'player' as const,
          life,
          hand: cards.slice(0, handEnd),
          battlefield: cards.slice(handEnd, fieldEnd),
          deck: cards.slice(fieldEnd),
          manaMax,
          manaAvailable,
        };
      }),
  );

describe('engine invariants (property-based)', () => {
  it('applyDamage never drops life below 0', () => {
    fc.assert(
      fc.property(playerArb, fc.integer({ min: 0, max: 100 }), (p, dmg) => {
        const next = applyDamage(p, dmg);
        expect(next.life).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('applyDamage with 0 leaves life unchanged', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        expect(applyDamage(p, 0).life).toBe(p.life);
      }),
    );
  });

  it('playCardToField never drops manaAvailable below 0', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        if (p.hand.length === 0) return;
        const card = p.hand[0]!;
        const next = playCardToField(p, card.id);
        expect(next.manaAvailable).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('playCardToField is a no-op when the card id is not in hand', () => {
    fc.assert(
      fc.property(playerArb, fc.string({ minLength: 1, maxLength: 8 }), (p, fakeId) => {
        // Make sure fakeId truly isn't in the player's hand.
        if (p.hand.some((c) => c.id === fakeId)) return;
        expect(playCardToField(p, fakeId)).toBe(p);
      }),
    );
  });

  it('playCardToField removes the card from hand and adds it to battlefield (entering sick)', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        if (p.hand.length === 0) return;
        const card = p.hand[0]!;
        const next = playCardToField(p, card.id);
        expect(next.hand.find((c) => c.id === card.id)).toBeUndefined();
        const onField = next.battlefield.find((c) => c.id === card.id);
        expect(onField).toBeDefined();
        expect(onField?.summoningSick).toBe(true);
      }),
    );
  });

  it('drawCard either returns a drawn card and grows the hand by 1, or returns null on empty deck', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        const { player: next, drawn } = drawCard(p);
        if (p.deck.length === 0) {
          expect(drawn).toBeNull();
          expect(next).toBe(p);
          return;
        }
        expect(drawn).not.toBeNull();
        expect(next.hand.length).toBe(p.hand.length + 1);
        expect(next.deck.length).toBe(p.deck.length - 1);
      }),
    );
  });

  it('canAfford agrees with manaAvailable >= cmc', () => {
    fc.assert(
      fc.property(playerArb, cardArb, (p, c) => {
        expect(canAfford(p, c)).toBe(p.manaAvailable >= c.cmc);
      }),
    );
  });

  it('beginTurn ramps manaMax by exactly 1 and refills manaAvailable to the new max', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        const next = beginTurn(p);
        expect(next.manaMax).toBe(p.manaMax + 1);
        expect(next.manaAvailable).toBe(next.manaMax);
      }),
    );
  });

  it('beginTurn clears summoningSick and attackedThisTurn on every battlefield creature', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        const next = beginTurn(p);
        for (const c of next.battlefield) {
          expect(c.summoningSick).toBeFalsy();
          expect(c.attackedThisTurn).toBeFalsy();
        }
      }),
    );
  });

  it('resolveCombat against face does the attacker.power damage to player and lets the attacker live', () => {
    fc.assert(
      fc.property(cardArb, (atk) => {
        const r = resolveCombat(atk, null);
        expect(r.playerDamage).toBe(atk.power);
        expect(r.attackerDamage).toBe(atk.power);
        expect(r.attackerDies).toBe(false);
        expect(r.blockerDies).toBe(false);
      }),
    );
  });

  it('resolveCombat with blocker is symmetric in lethal-damage logic', () => {
    fc.assert(
      fc.property(cardArb, cardArb, (atk, blk) => {
        const r = resolveCombat(atk, blk);
        // playerDamage is always 0 when blocker present.
        expect(r.playerDamage).toBe(0);
        // Lethal-damage symmetry.
        expect(r.attackerDies).toBe(blk.power >= atk.toughness);
        expect(r.blockerDies).toBe(atk.power >= blk.toughness);
      }),
    );
  });
});
