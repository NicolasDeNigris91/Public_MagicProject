import { create } from 'zustand';
import type {
  AnnouncePriority,
  GameResult,
  ICard,
  IGameState,
  IPlayer,
  LogEntry,
  LogKind,
  PlayerId,
} from '@/engine/types';
import {
  applyDamage,
  beginTurn,
  canAfford,
  canAttack,
  canAttackFace,
  drawCard,
  playCardToField,
  removeFromField,
  resolveCombat,
} from '@/engine/rules';
import { shortCardLabel } from '@/utils/describeCard';

interface GameActions {
  initGame: (playerDeck: ICard[], opponentDeck: ICard[]) => void;
  drawCard: (who: PlayerId) => void;
  playCardToField: (who: PlayerId, cardId: string) => void;
  attack: (attackerId: string, blockerId: string | null) => void;
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

// Monotonic sequence guarantees unique log ids even when several entries
// are appended in the same millisecond. The announcer uses id as its
// cursor, so any collision would cause a message to be re-spoken.
let logSeq = 0;
function log(
  msg: string,
  priority: AnnouncePriority,
  kind: LogKind = 'info',
  meta?: Record<string, string | number>,
): LogEntry {
  return {
    id: `log-${++logSeq}`,
    message: msg,
    priority,
    timestamp: Date.now(),
    kind,
    ...(meta ? { meta } : {}),
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
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
  phase: 'main',
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
      phase: 'main',
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
    const s = get();
    if (s.winner) return;
    const target = s[who];
    const { player: updated, drawn } = drawCard(target);
    if (!drawn) {
      // Decking out is a loss condition in MTG. We trigger it here so
      // that "tried to draw from an empty deck" is a terminal event.
      const winner: GameResult = who === 'player' ? 'opponent' : 'player';
      set({ winner });
      get().announce(
        who === 'player'
          ? 'You tried to draw from an empty deck. You lose the match.'
          : 'Opponent tried to draw from an empty deck. You win the match.',
        'assertive',
        'game-over',
        { winner: who === 'player' ? 'opponent' : 'player', reason: 'decking' },
      );
      return;
    }
    set({ [who]: updated } as Partial<GameStore>);
    if (who === 'player') {
      get().announce(
        `You drew ${drawn.name}. Hand size ${updated.hand.length}.`,
        'polite',
        'draw',
        { player: 'player', card: drawn.name, handSize: updated.hand.length },
      );
    } else {
      get().announce(
        `Opponent drew a card. Their hand size is ${updated.hand.length}.`,
        'polite',
        'draw',
        { player: 'opponent', handSize: updated.hand.length },
      );
    }
  },

  playCardToField: (who, cardId) => {
    const s = get();
    if (s.winner) return;
    if (s.turn !== who) return;
    const card = s[who].hand.find((c) => c.id === cardId);
    if (!card) return;
    if (!canAfford(s[who], card)) {
      if (who === 'player') {
        get().announce(
          `Cannot play ${card.name} - costs ${card.cmc}, you have ${s[who].manaAvailable} mana.`,
          'polite',
        );
      }
      return;
    }
    const updated = playCardToField(s[who], cardId);
    set({ [who]: updated } as Partial<GameStore>);
    const label = shortCardLabel(card);
    get().announce(
      who === 'player'
        ? `You played ${label} to the battlefield. It has summoning sickness and cannot attack this turn.`
        : `Opponent played ${label}. It has summoning sickness.`,
      'polite',
      'play',
      { player: who, card: card.name },
    );
  },

  attack: (attackerId, blockerId) => {
    const s = get();
    if (s.winner) return;
    const attackingSide = s.turn;
    const defendingSide: PlayerId = attackingSide === 'player' ? 'opponent' : 'player';
    const attacker = s[attackingSide].battlefield.find((c) => c.id === attackerId);
    if (!attacker) return;
    if (!canAttack(attacker)) {
      if (attackingSide === 'player') {
        const reason = attacker.summoningSick
          ? 'has summoning sickness'
          : 'has already attacked this turn';
        get().announce(`${attacker.name} ${reason} and cannot attack.`, 'polite');
      }
      return;
    }
    const blocker = blockerId
      ? (s[defendingSide].battlefield.find((c) => c.id === blockerId) ?? null)
      : null;

    if (!blocker && !canAttackFace(s[defendingSide])) {
      if (attackingSide === 'player') {
        get().announce(
          'Cannot attack directly while the opponent has creatures on the battlefield.',
          'polite',
        );
      }
      return;
    }

    const result = resolveCombat(attacker, blocker);

    let attackerPlayer = s[attackingSide];
    let defenderPlayer = s[defendingSide];

    if (result.attackerDies) {
      attackerPlayer = removeFromField(attackerPlayer, attacker.id);
    } else {
      attackerPlayer = {
        ...attackerPlayer,
        battlefield: attackerPlayer.battlefield.map((c) =>
          c.id === attacker.id ? { ...c, attackedThisTurn: true } : c,
        ),
      };
    }
    if (result.blockerDies && blocker) defenderPlayer = removeFromField(defenderPlayer, blocker.id);
    if (result.playerDamage > 0) defenderPlayer = applyDamage(defenderPlayer, result.playerDamage);

    const winner: GameResult = defenderPlayer.life <= 0 ? attackingSide : null;

    set({
      [attackingSide]: attackerPlayer,
      [defendingSide]: defenderPlayer,
      ...(winner ? { winner } : {}),
    } as Partial<GameStore>);

    const who = attackingSide === 'player' ? 'You' : 'Opponent';
    if (blocker) {
      get().announce(
        `${who} attacked with ${shortCardLabel(attacker)}, blocked by ${shortCardLabel(blocker)}. ${
          result.attackerDies ? `${attacker.name} dies. ` : ''
        }${result.blockerDies ? `${blocker.name} dies.` : ''}`.trim(),
        'assertive',
        'combat',
        {
          attackingSide,
          attacker: attacker.name,
          blocker: blocker.name,
          attackerDies: result.attackerDies ? 1 : 0,
          blockerDies: result.blockerDies ? 1 : 0,
        },
      );
    } else {
      get().announce(
        `${who} attacked with ${shortCardLabel(attacker)}, dealing ${result.playerDamage} damage. ${
          defendingSide === 'player' ? 'Your' : "Opponent's"
        } life is now ${defenderPlayer.life}.`,
        'assertive',
        'combat',
        {
          attackingSide,
          attacker: attacker.name,
          damage: result.playerDamage,
          defenderLife: defenderPlayer.life,
        },
      );
    }

    if (winner) {
      get().announce(
        winner === 'player'
          ? 'Victory! You defeated the opponent.'
          : 'Defeat. The opponent reduced your life to zero.',
        'assertive',
        'game-over',
        { winner },
      );
    }
  },

  endTurn: () => {
    const s = get();
    if (s.winner) return;
    const next: PlayerId = s.turn === 'player' ? 'opponent' : 'player';
    const bumpTurn = next === 'player' ? 1 : 0;
    const updatedNext = beginTurn(s[next]);
    set({
      turn: next,
      turnNumber: s.turnNumber + bumpTurn,
      [next]: updatedNext,
    } as Partial<GameStore>);
    get().announce(
      next === 'player' ? `Turn ${s.turnNumber + bumpTurn}. Your turn.` : "Opponent's turn.",
      'polite',
      'turn',
      { turnNumber: s.turnNumber + bumpTurn, player: next },
    );
    if (next === 'player') {
      get().announce(`${updatedNext.manaMax} mana available.`, 'polite', 'mana', {
        player: 'player',
        manaMax: updatedNext.manaMax,
        manaAvailable: updatedNext.manaAvailable,
      });
    }
    get().drawCard(next);
  },
}));
