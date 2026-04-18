import { create } from 'zustand';
import type { AnnouncePriority, GameResult, ICard, IGameState, IPlayer, LogEntry, PlayerId } from '@/engine/types';
import {
  PLAYS_PER_TURN, applyDamage, beginTurn, canAttack, canPlay,
  drawCard, playCardToField, removeFromField, resolveCombat,
} from '@/engine/rules';
import { shortCardLabel } from '@/utils/describeCard';

interface GameActions {
  initGame: (deck: ICard[]) => void;
  drawCard: (who: PlayerId) => void;
  playCardToField: (who: PlayerId, cardId: string) => void;
  attack: (attackerId: string, blockerId: string | null) => void;
  endTurn: () => void;
  announce: (message: string, priority?: AnnouncePriority) => void;
}

type GameStore = IGameState & GameActions;

const STARTING_LIFE = 20;
const STARTING_HAND = 5;
/** Cap on retained log entries. Prevents unbounded growth in long
 *  matches. The announcer tracks its cursor by entry id, so trimming
 *  the head of the array is safe. */
const MAX_LOG = 200;

function splitDeck(all: ICard[]): { playerDeck: ICard[]; opponentDeck: ICard[] } {
  const half = Math.floor(all.length / 2);
  return { playerDeck: all.slice(0, half), opponentDeck: all.slice(half) };
}

function makePlayer(id: PlayerId, deck: ICard[]): IPlayer {
  const hand = deck.slice(0, STARTING_HAND);
  return {
    id, life: STARTING_LIFE, hand, battlefield: [],
    deck: deck.slice(STARTING_HAND),
    // Opponent starts with 0 plays — they get refilled when their
    // turn begins. Player starts with PLAYS_PER_TURN because it is
    // already their turn on init.
    playsRemaining: id === 'player' ? PLAYS_PER_TURN : 0,
  };
}

function log(msg: string, priority: AnnouncePriority): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message: msg, priority, timestamp: Date.now(),
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  player: { id: 'player', life: STARTING_LIFE, hand: [], battlefield: [], deck: [], playsRemaining: 0 },
  opponent: { id: 'opponent', life: STARTING_LIFE, hand: [], battlefield: [], deck: [], playsRemaining: 0 },
  turn: 'player',
  phase: 'main',
  gameLog: [],
  winner: null as GameResult,
  turnNumber: 1,
  generation: 0,
  initialized: false,

  initGame: (deck) => {
    const { playerDeck, opponentDeck } = splitDeck(deck);
    set((s) => ({
      player: makePlayer('player', playerDeck),
      opponent: makePlayer('opponent', opponentDeck),
      turn: 'player',
      phase: 'main',
      winner: null,
      turnNumber: 1,
      initialized: true,
      generation: s.generation + 1,
      gameLog: [log(`New match. Turn 1. You have ${STARTING_LIFE} life, ${STARTING_HAND} cards, and one play. Your turn.`, 'polite')],
    }));
  },

  announce: (message, priority = 'polite') => {
    set((s) => {
      const next = [...s.gameLog, log(message, priority)];
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
      );
      return;
    }
    set({ [who]: updated } as Partial<GameStore>);
    if (who === 'player') {
      get().announce(`You drew ${drawn.name}. Hand size ${updated.hand.length}.`, 'polite');
    } else {
      get().announce(`Opponent drew a card. Their hand size is ${updated.hand.length}.`, 'polite');
    }
  },

  playCardToField: (who, cardId) => {
    const s = get();
    if (s.winner) return;
    if (s.turn !== who) return;
    if (!canPlay(s[who])) {
      if (who === 'player') {
        get().announce('No plays remaining this turn. End your turn to continue.', 'polite');
      }
      return;
    }
    const card = s[who].hand.find((c) => c.id === cardId);
    if (!card) return;
    const updated = playCardToField(s[who], cardId);
    set({ [who]: updated } as Partial<GameStore>);
    const label = shortCardLabel(card);
    get().announce(
      who === 'player'
        ? `You played ${label} to the battlefield. It has summoning sickness and cannot attack this turn.`
        : `Opponent played ${label}. It has summoning sickness.`,
      'polite',
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
      ? s[defendingSide].battlefield.find((c) => c.id === blockerId) ?? null
      : null;

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
      );
    } else {
      get().announce(
        `${who} attacked with ${shortCardLabel(attacker)}, dealing ${result.playerDamage} damage. ${
          defendingSide === 'player' ? 'Your' : "Opponent's"
        } life is now ${defenderPlayer.life}.`,
        'assertive',
      );
    }

    if (winner) {
      get().announce(
        winner === 'player'
          ? 'Victory! You defeated the opponent.'
          : 'Defeat. The opponent reduced your life to zero.',
        'assertive',
      );
    }
  },

  endTurn: () => {
    const s = get();
    if (s.winner) return;
    const next: PlayerId = s.turn === 'player' ? 'opponent' : 'player';
    const bumpTurn = next === 'player' ? 1 : 0;
    // Begin-of-turn for the incoming player: clear summoning
    // sickness on their creatures and refill plays.
    set({
      turn: next,
      turnNumber: s.turnNumber + bumpTurn,
      [next]: beginTurn(s[next]),
    } as Partial<GameStore>);
    get().announce(
      next === 'player'
        ? `Turn ${s.turnNumber + bumpTurn}. Your turn.`
        : "Opponent's turn.",
      'polite',
    );
    get().drawCard(next);
  },
}));
