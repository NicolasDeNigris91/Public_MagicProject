/**
 * Domain types for the game engine.
 *
 * A11y note: `accessibilityDescription` is a first-class field on ICard.
 * Treating it as data (not a render-time concern) guarantees that every
 * code path — combat log, announcements, card focus — uses the same
 * canonical description. A blind user and a sighted user get the same
 * information; only the medium differs.
 */

import type { Color } from './color';

export type PlayerId = 'player' | 'opponent';
export type Phase = 'draw' | 'main' | 'combat' | 'end';
export type AnnouncePriority = 'polite' | 'assertive';

export interface ICard {
  id: string;
  name: string;
  power: number;
  toughness: number;
  /** Converted mana cost. Integer total mana value of the card,
   *  parsed from the Scryfall `cmc` field. */
  cmc: number;
  /** Canonical mono-color of the card. `undefined` for multicolor
   *  or colorless cards (which are filtered out before they reach
   *  the engine). */
  color?: Color;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  imageUrl: string;
  imageUrlSmall: string;
  accessibilityDescription: string;
  /** True while the creature has summoning sickness (entered this
   *  turn and therefore cannot attack). Cleared at start of its
   *  controller's next turn. */
  summoningSick?: boolean;
  /** True once the creature has attacked this turn. Cleared at the
   *  start of its controller's next turn. Prevents re-attacking. */
  attackedThisTurn?: boolean;
}

export interface IPlayer {
  id: PlayerId;
  life: number;
  hand: ICard[];
  battlefield: ICard[];
  deck: ICard[];
  /** Number of creatures this player may still play this turn.
   *  Refilled to PLAYS_PER_TURN at the start of their turn. */
  playsRemaining: number;
}

export interface LogEntry {
  id: string;
  message: string;
  priority: AnnouncePriority;
  timestamp: number;
}

export type GameResult = 'player' | 'opponent' | null;

export interface IGameState {
  player: IPlayer;
  opponent: IPlayer;
  turn: PlayerId;
  phase: Phase;
  gameLog: LogEntry[];
  winner: GameResult;
  turnNumber: number;
  /** Incremented on each `initGame`. Async loops (AI timers) capture
   *  this at schedule time and bail if it advances, so stale timers
   *  from a previous match never mutate a replay. */
  generation: number;
  /** True once a deck has been loaded. Used by UI to distinguish
   *  "still fetching" from "deck empty mid-game". */
  initialized: boolean;
}

export interface ICombatResult {
  attackerDamage: number;
  blockerDamage: number;
  attackerDies: boolean;
  blockerDies: boolean;
  playerDamage: number;
}
