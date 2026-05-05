// Greedy opponent: play the biggest affordable creature; attack into the
// weakest legal blocker, or face if the board is empty.
import type { CardId, ICard, IPlayer } from './types';

export function pickCardToPlay(hand: ICard[], manaAvailable: number): ICard | null {
  const affordable = hand.filter((c) => /creature/i.test(c.typeLine) && c.cmc <= manaAvailable);
  if (affordable.length === 0) return null;
  return [...affordable].sort((a, b) => b.power - a.power)[0] ?? null;
}

export interface AttackPlan {
  attackerId: CardId;
  blockerId: CardId | null;
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
