import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { cardId, logEntryId } from '@/engine/types';
import { createGameStore, type IdGen } from './useGameStore';
import type { ICard } from '@/engine/types';

/**
 * Long-session property test.
 *
 * Replays sequences of 30–80 random store actions against a freshly
 * initialised game and asserts the cross-action invariants that no
 * single-action unit test catches. The point is to surface drift
 * between actions — a bug where an action has the right local
 * postcondition but corrupts the next action's preconditions only
 * shows up when actions chain.
 *
 * Invariants checked after every step:
 *   - life and manaAvailable are non-negative
 *   - manaAvailable <= manaMax
 *   - manaMax never decreases (only beginTurn ramps it)
 *   - turnNumber is monotonically non-decreasing
 *   - gameLog.length is non-decreasing (front-truncation at MAX_LOG
 *     means the cap holds steady but never shrinks)
 *   - card ids are unique within a player's three zones
 *   - card ids never cross from one player to the other
 *   - once a winner is decided, life stays at the post-lethal value
 *     (no spurious resurrections)
 */

function bareCard(id: string, power = 2, toughness = 2, cmc = 1): ICard {
  return {
    id: cardId(id),
    name: id.toUpperCase(),
    power,
    toughness,
    cmc,
    color: 'R',
    manaCost: cmc <= 1 ? '{R}' : `{${cmc - 1}}{R}`,
    typeLine: 'Creature',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: id,
  };
}

// Decks deep enough that decking-out happens late if at all in an
// 80-turn run. Mix of cmcs so the play action sometimes succeeds and
// sometimes fails, which exercises the "info log only" branches.
const playerDeck: ICard[] = Array.from({ length: 40 }, (_, i) =>
  bareCard(`p${i}`, 1 + (i % 4), 1 + (i % 4), 1 + (i % 3)),
);
const opponentDeck: ICard[] = Array.from({ length: 40 }, (_, i) =>
  bareCard(`o${i}`, 1 + (i % 4), 1 + (i % 4), 1 + (i % 3)),
);

const actionArb = fc.oneof(
  fc.record({ kind: fc.constant('play' as const) }),
  fc.record({ kind: fc.constant('attack-face' as const) }),
  fc.record({ kind: fc.constant('attack-blocker' as const) }),
  fc.record({ kind: fc.constant('end-turn' as const) }),
);
type Action =
  | { kind: 'play' }
  | { kind: 'attack-face' }
  | { kind: 'attack-blocker' }
  | { kind: 'end-turn' };

function freshStore() {
  let n = 0;
  const idGen: IdGen = () => logEntryId(`s-${++n}`);
  const store = createGameStore({ clock: () => 0, idGen, getLang: () => 'en' });
  store.getState().initGame([...playerDeck], [...opponentDeck]);
  return store;
}

describe('useGameStore — long-session invariants', () => {
  it(
    'state invariants hold across 30–80 random store actions',
    () => {
      fc.assert(
        fc.property(fc.array(actionArb, { minLength: 30, maxLength: 80 }), (actions) => {
          const store = freshStore();
          let prevLogLen = store.getState().gameLog.length;
          let prevTurnNumber = store.getState().turnNumber;
          let prevPlayerManaMax = store.getState().player.manaMax;
          let prevOpponentManaMax = store.getState().opponent.manaMax;

          for (const action of actions as Action[]) {
            const before = store.getState();
            const side = before.turn;
            const me = before[side];
            const them = side === 'player' ? before.opponent : before.player;

            switch (action.kind) {
              case 'play': {
                const card = me.hand[0];
                if (card) store.getState().playCardToField(side, card.id);
                break;
              }
              case 'attack-face': {
                const att = me.battlefield.find((c) => !c.summoningSick && !c.attackedThisTurn);
                if (att) store.getState().attack(att.id, null);
                break;
              }
              case 'attack-blocker': {
                const att = me.battlefield.find((c) => !c.summoningSick && !c.attackedThisTurn);
                const blk = them.battlefield[0];
                if (att) store.getState().attack(att.id, blk?.id ?? null);
                break;
              }
              case 'end-turn':
                store.getState().endTurn();
                break;
            }

            const s = store.getState();

            // Life is bounded below.
            expect(s.player.life).toBeGreaterThanOrEqual(0);
            expect(s.opponent.life).toBeGreaterThanOrEqual(0);

            // Mana invariants on both sides.
            expect(s.player.manaAvailable).toBeGreaterThanOrEqual(0);
            expect(s.opponent.manaAvailable).toBeGreaterThanOrEqual(0);
            expect(s.player.manaAvailable).toBeLessThanOrEqual(s.player.manaMax);
            expect(s.opponent.manaAvailable).toBeLessThanOrEqual(s.opponent.manaMax);

            // manaMax never goes down.
            expect(s.player.manaMax).toBeGreaterThanOrEqual(prevPlayerManaMax);
            expect(s.opponent.manaMax).toBeGreaterThanOrEqual(prevOpponentManaMax);
            prevPlayerManaMax = s.player.manaMax;
            prevOpponentManaMax = s.opponent.manaMax;

            // Turn counter never decreases.
            expect(s.turnNumber).toBeGreaterThanOrEqual(prevTurnNumber);
            prevTurnNumber = s.turnNumber;

            // gameLog never shrinks (front-truncation at MAX_LOG keeps
            // length steady but doesn't drop entries below the cap).
            expect(s.gameLog.length).toBeGreaterThanOrEqual(prevLogLen);
            prevLogLen = s.gameLog.length;

            // Card-id uniqueness within each player's three zones.
            const playerIds = [...s.player.hand, ...s.player.battlefield, ...s.player.deck].map(
              (c) => c.id,
            );
            expect(new Set(playerIds).size).toBe(playerIds.length);
            const oppIds = [...s.opponent.hand, ...s.opponent.battlefield, ...s.opponent.deck].map(
              (c) => c.id,
            );
            expect(new Set(oppIds).size).toBe(oppIds.length);

            // No card ever crosses sides — the engine shouldn't ever
            // mutate one player's battlefield from another's input.
            const intersection = playerIds.filter((id) => oppIds.includes(id));
            expect(intersection).toEqual([]);
          }
        }),
        { numRuns: 50 },
      );
    },
    { timeout: 30_000 },
  );

  it('once winner flips, neither life value moves on subsequent actions', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { minLength: 5, maxLength: 30 }), (actions) => {
        const store = freshStore();
        // Force a near-lethal state so the run is likely to flip
        // winner during the action sequence.
        store.setState({
          player: { ...store.getState().player, life: 1 },
          opponent: { ...store.getState().opponent, life: 1 },
        });

        let lockedSnapshot: { player: number; opponent: number } | null = null;

        for (const action of actions as Action[]) {
          const before = store.getState();
          const side = before.turn;
          const me = before[side];
          const them = side === 'player' ? before.opponent : before.player;

          switch (action.kind) {
            case 'play': {
              const card = me.hand[0];
              if (card) store.getState().playCardToField(side, card.id);
              break;
            }
            case 'attack-face': {
              const att = me.battlefield.find((c) => !c.summoningSick && !c.attackedThisTurn);
              if (att) store.getState().attack(att.id, null);
              break;
            }
            case 'attack-blocker': {
              const att = me.battlefield.find((c) => !c.summoningSick && !c.attackedThisTurn);
              const blk = them.battlefield[0];
              if (att) store.getState().attack(att.id, blk?.id ?? null);
              break;
            }
            case 'end-turn':
              store.getState().endTurn();
              break;
          }

          const s = store.getState();
          if (s.winner && !lockedSnapshot) {
            lockedSnapshot = { player: s.player.life, opponent: s.opponent.life };
          } else if (s.winner && lockedSnapshot) {
            expect(s.player.life).toBe(lockedSnapshot.player);
            expect(s.opponent.life).toBe(lockedSnapshot.opponent);
          }
        }
      }),
      { numRuns: 30 },
    );
  });
});
