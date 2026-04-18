/**
 * Minimal opponent AI. Intentionally simple and deterministic-ish:
 *  - On main phase: play the highest-power creature in hand.
 *  - On combat: attack with each untapped creature into the weakest
 *    possible blocker. Direct (face) attacks are only allowed when the
 *    defender has no creatures at all — matches the house rule enforced
 *    by the engine and UI.
 *
 * Kept in `engine/` because it depends only on ICard shapes — no React,
 * no store. The store orchestrates; this file just picks moves.
 */
import type { ICard, IPlayer } from './types';

export function pickCardToPlay(hand: ICard[]): ICard | null {
  const creatures = hand.filter((c) => /creature/i.test(c.typeLine));
  if (creatures.length === 0) return null;
  return [...creatures].sort((a, b) => b.power - a.power)[0] ?? null;
}

export interface AttackPlan {
  attackerId: string;
  blockerId: string | null;
}

export function planAttacks(me: IPlayer, opponent: IPlayer): AttackPlan[] {
  const plans: AttackPlan[] = [];
  const availableBlockers = [...opponent.battlefield];
  for (const attacker of me.battlefield) {
    // Find the weakest blocker the attacker can kill without dying.
    const safeKill = availableBlockers
      .filter((b) => attacker.power >= b.toughness && b.power < attacker.toughness)
      .sort((a, b) => a.toughness - b.toughness)[0];
    if (safeKill) {
      plans.push({ attackerId: attacker.id, blockerId: safeKill.id });
      availableBlockers.splice(availableBlockers.indexOf(safeKill), 1);
      continue;
    }
    // Face damage is only allowed when the defender's board is empty.
    // With creatures still present, pass rather than trade into a wall.
    if (availableBlockers.length === 0) {
      plans.push({ attackerId: attacker.id, blockerId: null });
    }
  }
  return plans;
}
