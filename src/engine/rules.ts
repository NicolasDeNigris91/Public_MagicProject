/**
 * Pure rules engine. No React, no Zustand, no network.
 * Every function takes state, returns new state. Deterministic & testable.
 */
import type { ICard, ICombatResult, IPlayer } from './types';

export const PLAYS_PER_TURN = 1;

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

/**
 * Play a creature card from hand to the battlefield. Decrements the
 * player's `playsRemaining` and marks the entering creature with
 * summoning sickness so it cannot attack the turn it comes down.
 * Caller is responsible for checking `canPlay` first if enforcement
 * is desired (store does this; engine stays pure).
 */
export function playCardToField(player: IPlayer, cardId: string): IPlayer {
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return player;
  const entering: ICard = { ...card, summoningSick: true };
  return {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    battlefield: [...player.battlefield, entering],
    playsRemaining: Math.max(0, player.playsRemaining - 1),
  };
}

export function canPlay(player: IPlayer): boolean {
  return player.playsRemaining > 0;
}

export function canAttack(card: ICard): boolean {
  return !card.summoningSick && !card.attackedThisTurn;
}

/**
 * One-on-one MTG combat resolution. If no blocker, attacker hits the
 * player directly. Damage is simultaneous (both sides deal damage
 * before death).
 */
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

/**
 * Begin-of-turn housekeeping for the player whose turn is starting:
 * clear summoning sickness and attack-lock on all their creatures,
 * and refill plays.
 */
export function beginTurn(player: IPlayer): IPlayer {
  return {
    ...player,
    battlefield: player.battlefield.map((c) =>
      c.summoningSick || c.attackedThisTurn
        ? { ...c, summoningSick: false, attackedThisTurn: false }
        : c,
    ),
    playsRemaining: PLAYS_PER_TURN,
  };
}
