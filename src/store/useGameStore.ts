import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type ActionResult,
  executeAttack,
  executeDrawCard,
  executeEndTurn,
  executePlayCardToField,
} from '@/engine/actions';
import { logEntryId } from '@/engine/types';
import type {
  AnnouncePriority,
  CardId,
  GameResult,
  ICard,
  IGameState,
  IPlayer,
  LogEntry,
  LogEntryId,
  LogKind,
  PlayerId,
} from '@/engine/types';

interface GameActions {
  initGame: (playerDeck: ICard[], opponentDeck: ICard[]) => void;
  drawCard: (who: PlayerId) => void;
  playCardToField: (who: PlayerId, cardId: CardId) => void;
  attack: (attackerId: CardId, blockerId: CardId | null) => void;
  endTurn: () => void;
  /**
   * Append a message to the log. `kind` tags the entry for the
   * visible combat log to style; if omitted, defaults to 'info'.
   * `meta` carries structured data alongside the pre-built message
   * for future localization and richer rendering.
   */
  announce: (
    message: string,
    priority?: AnnouncePriority,
    kind?: LogKind,
    meta?: Record<string, string | number>,
  ) => void;
}

type GameStore = IGameState & GameActions;
type StoreGet = () => GameStore;
type StoreSet = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type LogMinter = (
  msg: string,
  priority: AnnouncePriority,
  kind?: LogKind,
  meta?: Record<string, string | number>,
) => LogEntry;

/**
 * Apply a pure ActionResult to the store: mint each log seed into a
 * full LogEntry via the per-store Clock + IdGen, then write the new
 * state slices and the appended log in a single set() call so React
 * sees one render. Idempotent for empty-log results — those still
 * write the (unchanged) state slices, which is fine.
 */
function applyResult(set: StoreSet, get: StoreGet, log: LogMinter, result: ActionResult): void {
  set((s) => {
    const minted = result.logs.map((l) => log(l.message, l.priority, l.kind, l.meta));
    const merged = [...s.gameLog, ...minted];
    return {
      player: result.next.player,
      opponent: result.next.opponent,
      turn: result.next.turn,
      turnNumber: result.next.turnNumber,
      winner: result.next.winner,
      generation: result.next.generation,
      initialized: result.next.initialized,
      gameLog: merged.length > MAX_LOG ? merged.slice(-MAX_LOG) : merged,
    };
  });
  // get() is unused here today, but kept on the signature so future
  // actions that need to chain reads after the apply have a uniform
  // hook. Cheap to keep, costly to add later if every callsite
  // already adopted the 3-arg shape.
  void get;
}

const STARTING_LIFE = 20;
const STARTING_HAND = 5;
/** Cap on retained log entries. Prevents unbounded growth in long
 *  matches. The announcer tracks its cursor by entry id, so trimming
 *  the head of the array is safe. */
const MAX_LOG = 200;

function makePlayer(id: PlayerId, deck: ICard[]): IPlayer {
  const hand = deck.slice(0, STARTING_HAND);
  // It's the player's turn at init, so they start with T1 mana
  // already (manaMax=1, manaAvailable=1). Opponent starts at 0 and
  // gets ramped by beginTurn when their turn begins.
  return {
    id,
    life: STARTING_LIFE,
    hand,
    battlefield: [],
    deck: deck.slice(STARTING_HAND),
    manaMax: id === 'player' ? 1 : 0,
    manaAvailable: id === 'player' ? 1 : 0,
  };
}

/** Wall-clock function. Defaults to Date.now; tests inject a fixed
 *  value via createGameStore({ clock }). */
export type Clock = () => number;
/** Log-id minter. Default is a monotonic `log-N` sequence; tests
 *  inject a deterministic generator via createGameStore({ idGen }). */
export type IdGen = () => LogEntryId;

export interface GameStoreDependencies {
  clock?: Clock;
  idGen?: IdGen;
}

function defaultIdGen(): IdGen {
  // Monotonic sequence guarantees unique log ids even when several
  // entries are appended in the same millisecond. The announcer uses
  // id as its cursor, so any collision would cause a message to be
  // re-spoken.
  let seq = 0;
  return () => logEntryId(`log-${++seq}`);
}

/**
 * Build a fresh game store with optional clock + id-generator
 * overrides. The default singleton (`useGameStore`) is created at
 * module load with `Date.now` and an in-process counter; tests may
 * call `createGameStore({ clock, idGen })` to get an isolated store
 * whose log timestamps and ids are byte-stable across runs.
 *
 * devtools is wrapped only in development so the production bundle
 * stays free of the Redux DevTools adapter (it short-circuits to an
 * identity function when `window.__REDUX_DEVTOOLS_EXTENSION__` is
 * absent but still costs bytes). The action labels passed to set()
 * show up as discrete entries in the timeline.
 */
export function createGameStore(deps: GameStoreDependencies = {}) {
  const clock: Clock = deps.clock ?? (() => Date.now());
  const idGen: IdGen = deps.idGen ?? defaultIdGen();

  function log(
    msg: string,
    priority: AnnouncePriority,
    kind: LogKind = 'info',
    meta?: Record<string, string | number>,
  ): LogEntry {
    return {
      id: idGen(),
      message: msg,
      priority,
      timestamp: clock(),
      kind,
      ...(meta ? { meta } : {}),
    };
  }

  return create<GameStore>()(
    devtools(
      (set, get) => ({
        player: {
          id: 'player',
          life: STARTING_LIFE,
          hand: [],
          battlefield: [],
          deck: [],
          manaMax: 0,
          manaAvailable: 0,
        },
        opponent: {
          id: 'opponent',
          life: STARTING_LIFE,
          hand: [],
          battlefield: [],
          deck: [],
          manaMax: 0,
          manaAvailable: 0,
        },
        turn: 'player',
        gameLog: [],
        winner: null as GameResult,
        turnNumber: 1,
        generation: 0,
        initialized: false,

        initGame: (playerDeck, opponentDeck) => {
          set((s) => ({
            player: makePlayer('player', playerDeck),
            opponent: makePlayer('opponent', opponentDeck),
            turn: 'player',
            winner: null,
            turnNumber: 1,
            initialized: true,
            generation: s.generation + 1,
            gameLog: [
              log(
                `New match. Turn 1. You have ${STARTING_LIFE} life, ${STARTING_HAND} cards, and 1 mana. Your turn.`,
                'polite',
                'turn',
                { turnNumber: 1, player: 'player' },
              ),
            ],
          }));
        },

        announce: (message, priority = 'polite', kind = 'info', meta) => {
          set((s) => {
            const next = [...s.gameLog, log(message, priority, kind, meta)];
            return { gameLog: next.length > MAX_LOG ? next.slice(-MAX_LOG) : next };
          });
        },

        drawCard: (who) => {
          applyResult(set, get, log, executeDrawCard(get(), who));
        },

        playCardToField: (who, cardId) => {
          applyResult(set, get, log, executePlayCardToField(get(), who, cardId));
        },

        attack: (attackerId, blockerId) => {
          applyResult(set, get, log, executeAttack(get(), attackerId, blockerId));
        },

        endTurn: () => {
          applyResult(set, get, log, executeEndTurn(get()));
        },
      }),
      { name: 'game', enabled: process.env.NODE_ENV === 'development' },
    ),
  );
}

export const useGameStore = createGameStore();
