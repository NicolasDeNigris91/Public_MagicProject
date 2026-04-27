import type { ICard, ICombatResult, IPlayer } from './types';

export function drawCard(player: IPlayer): { player: IPlayer; drawn: ICard | null } {
  if (player.deck.length === 0) return { player, drawn: null };
  const [drawn, ...rest] = player.deck;
  return {
    drawn: drawn ?? null,
    player: drawn
      ? { ...player, deck: rest, hand: [...player.hand, drawn] }
      : player,
  };
}

// Spends card.cmc from manaAvailable. Caller should check canAfford first;
// the store does, the engine clamps defensively.
export function playCardToField(player: IPlayer, cardId: string): IPlayer {
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return player;
  const entering: ICard = { ...card, summoningSick: true };
  return {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    battlefield: [...player.battlefield, entering],
    manaAvailable: Math.max(0, player.manaAvailable - card.cmc),
  };
}

export function canAfford(player: IPlayer, card: ICard): boolean {
  return player.manaAvailable >= card.cmc;
}

export function canAttack(card: ICard): boolean {
  return !card.summoningSick && !card.attackedThisTurn;
}

// House rule: face damage only when the defender has no creatures.
export function canAttackFace(defender: IPlayer): boolean {
  return defender.battlefield.length === 0;
}

// Simultaneous damage. With no blocker the attacker hits face.
export function resolveCombat(attacker: ICard, blocker: ICard | null): ICombatResult {
  if (!blocker) {
    return {
      attackerDamage: attacker.power,
      blockerDamage: 0,
      attackerDies: false,
      blockerDies: false,
      playerDamage: attacker.power,
    };
  }
  return {
    attackerDamage: attacker.power,
    blockerDamage: blocker.power,
    attackerDies: blocker.power >= attacker.toughness,
    blockerDies: attacker.power >= blocker.toughness,
    playerDamage: 0,
  };
}

export function applyDamage(player: IPlayer, amount: number): IPlayer {
  return { ...player, life: Math.max(0, player.life - amount) };
}

export function removeFromField(player: IPlayer, cardId: string): IPlayer {
  return { ...player, battlefield: player.battlefield.filter((c) => c.id !== cardId) };
}

// Clears sickness/attack-lock, ramps manaMax by 1, refills available.
// Unspent mana does not carry over.
export function beginTurn(player: IPlayer): IPlayer {
  const manaMax = player.manaMax + 1;
  return {
    ...player,
    battlefield: player.battlefield.map((c) =>
      c.summoningSick || c.attackedThisTurn
        ? { ...c, summoningSick: false, attackedThisTurn: false }
        : c,
    ),
    manaMax,
    manaAvailable: manaMax,
  };
}
