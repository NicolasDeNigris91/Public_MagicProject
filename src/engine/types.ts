import type { Color } from './color';

export type PlayerId = 'player' | 'opponent';
export type AnnouncePriority = 'polite' | 'assertive';

// Branded ids. The brand is a unique-symbol property so two distinct
// id flavours never get accidentally swapped at a callsite (e.g.
// passing a LogEntryId into something that expects a CardId compiles
// today but would not after this change). Mint via cardId()/logEntryId()
// at trusted boundaries (Scryfall adapter, fallback deck, log appender)
// and the rest of the code receives them already branded.
declare const cardIdBrand: unique symbol;
declare const logEntryIdBrand: unique symbol;
export type CardId = string & { readonly [cardIdBrand]: never };
export type LogEntryId = string & { readonly [logEntryIdBrand]: never };
export const cardId = (s: string): CardId => s as CardId;
export const logEntryId = (s: string): LogEntryId => s as LogEntryId;

export interface ICard {
  id: CardId;
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
  /** Mana pool size for this turn. Increments by 1 at the start
   *  of each of this player's turns. No explicit cap. */
  manaMax: number;
  /** Unspent mana remaining this turn. Refilled to `manaMax` at
   *  start of turn; leftover is discarded (no carryover). */
  manaAvailable: number;
}

/**
 * Classification for a log entry. The UI derives styling and icons
 * from this; the announcer (live region) ignores it and reads
 * `message` verbatim. 'info' is the catch-all default.
 */
export type LogKind = 'info' | 'turn' | 'draw' | 'play' | 'combat' | 'mana' | 'game-over';

export interface LogEntry {
  id: LogEntryId;
  message: string;
  priority: AnnouncePriority;
  timestamp: number;
  /** Event classification used by the visible combat log for styling. */
  kind?: LogKind;
  /** Structured payload for future localization - kept alongside the
   *  pre-built `message` so rendering can upgrade without breaking
   *  call sites. */
  meta?: Record<string, string | number>;
}

export type GameResult = 'player' | 'opponent' | null;

export interface IGameState {
  player: IPlayer;
  opponent: IPlayer;
  turn: PlayerId;
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
