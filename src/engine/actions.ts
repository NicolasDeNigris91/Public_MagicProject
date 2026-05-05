/**
 * Pure transition functions for the three player-driven store
 * actions: attack, endTurn, drawCard. The store layer used to do
 * orchestration AND state mutation AND announcer side effects in one
 * imperative blob; this module handles orchestration as data, leaving
 * the store as a thin glue that mints log entry ids/timestamps via
 * its injected Clock + IdGen and applies the result with set().
 *
 * Each function returns:
 *   - `next`: the post-action IGameState (gameLog field is unchanged
 *     and ignored by the store glue).
 *   - `logs`: announcer entry seeds — message, priority, kind, meta.
 *     The store maps these through its log() helper to mint full
 *     LogEntry records with stable ids and timestamps.
 *
 * Announcer copy (the human-readable `message`) is part of the
 * contract: the equivalence snapshots in
 * src/store/useGameStore.equivalence.test.ts pin every string. Any
 * intentional copy change shows up as a snapshot diff that has to be
 * accepted in the same commit.
 */
import { shortCardLabel } from '@/utils/describeCard';
import {
  applyDamage,
  beginTurn,
  canAfford,
  canAttack,
  canAttackFace,
  drawCard as drawFromDeck,
  playCardToField as playCardToFieldRule,
  removeFromField,
  resolveCombat,
} from './rules';
import type {
  AnnouncePriority,
  CardId,
  GameResult,
  IGameState,
  IPlayer,
  LogKind,
  PlayerId,
} from './types';

export interface ActionLogSeed {
  message: string;
  priority: AnnouncePriority;
  kind: LogKind;
  meta?: Record<string, string | number>;
}

export interface ActionResult {
  /** Full post-action state. The store glue overwrites every field
   *  except gameLog — gameLog comes from store + minted log seeds. */
  next: IGameState;
  /** Announcer entries to append, in order. Empty for no-ops. */
  logs: ActionLogSeed[];
}

function setPlayerSlice(state: IGameState, who: PlayerId, p: IPlayer): IGameState {
  return who === 'player' ? { ...state, player: p } : { ...state, opponent: p };
}

function noop(state: IGameState): ActionResult {
  return { next: state, logs: [] };
}

/**
 * Play a creature from `who`'s hand to their battlefield. Validates
 * that it's their turn, the card exists, and they can afford the cmc;
 * the engine helper clamps mana defensively.
 *
 * Cards enter with summoningSick=true so they can't attack on the
 * turn they were played.
 */
export function executePlayCardToField(
  state: IGameState,
  who: PlayerId,
  cardId: CardId,
): ActionResult {
  if (state.winner) return noop(state);
  if (state.turn !== who) return noop(state);
  const card = state[who].hand.find((c) => c.id === cardId);
  if (!card) return noop(state);
  if (!canAfford(state[who], card)) {
    if (who !== 'player') return noop(state);
    return {
      next: state,
      logs: [
        {
          message: `Cannot play ${card.name} - costs ${card.cmc}, you have ${state[who].manaAvailable} mana.`,
          priority: 'polite',
          kind: 'info',
        },
      ],
    };
  }
  const updated = playCardToFieldRule(state[who], cardId);
  const next = setPlayerSlice(state, who, updated);
  const label = shortCardLabel(card);
  return {
    next,
    logs: [
      {
        message:
          who === 'player'
            ? `You played ${label} to the battlefield. It has summoning sickness and cannot attack this turn.`
            : `Opponent played ${label}. It has summoning sickness.`,
        priority: 'polite',
        kind: 'play',
        meta: { player: who, card: card.name },
      },
    ],
  };
}

/**
 * Draw one card for `who`. Decking out is the terminal "you tried to
 * draw from an empty deck" loss condition.
 */
export function executeDrawCard(state: IGameState, who: PlayerId): ActionResult {
  if (state.winner) return noop(state);
  const target = state[who];
  const { player: updated, drawn } = drawFromDeck(target);
  if (!drawn) {
    const winner: GameResult = who === 'player' ? 'opponent' : 'player';
    return {
      next: { ...state, winner },
      logs: [
        {
          message:
            who === 'player'
              ? 'You tried to draw from an empty deck. You lose the match.'
              : 'Opponent tried to draw from an empty deck. You win the match.',
          priority: 'assertive',
          kind: 'game-over',
          meta: { winner: who === 'player' ? 'opponent' : 'player', reason: 'decking' },
        },
      ],
    };
  }
  const next = setPlayerSlice(state, who, updated);
  const log: ActionLogSeed =
    who === 'player'
      ? {
          message: `You drew ${drawn.name}. Hand size ${updated.hand.length}.`,
          priority: 'polite',
          kind: 'draw',
          meta: { player: 'player', card: drawn.name, handSize: updated.hand.length },
        }
      : {
          message: `Opponent drew a card. Their hand size is ${updated.hand.length}.`,
          priority: 'polite',
          kind: 'draw',
          meta: { player: 'opponent', handSize: updated.hand.length },
        };
  return { next, logs: [log] };
}

/**
 * Pass the turn. beginTurn ramps mana for the new active side and
 * clears summoning sickness; the active side then draws their card
 * for the turn (chained via executeDrawCard so any decking-out lands
 * inside this same action).
 */
export function executeEndTurn(state: IGameState): ActionResult {
  if (state.winner) return noop(state);
  const nextSide: PlayerId = state.turn === 'player' ? 'opponent' : 'player';
  const bumpTurn = nextSide === 'player' ? 1 : 0;
  const updatedNext = beginTurn(state[nextSide]);
  const newTurnNumber = state.turnNumber + bumpTurn;
  let s = setPlayerSlice(state, nextSide, updatedNext);
  s = { ...s, turn: nextSide, turnNumber: newTurnNumber };

  const logs: ActionLogSeed[] = [
    {
      message: nextSide === 'player' ? `Turn ${newTurnNumber}. Your turn.` : "Opponent's turn.",
      priority: 'polite',
      kind: 'turn',
      meta: { turnNumber: newTurnNumber, player: nextSide },
    },
  ];
  if (nextSide === 'player') {
    logs.push({
      message: `${updatedNext.manaMax} mana available.`,
      priority: 'polite',
      kind: 'mana',
      meta: {
        player: 'player',
        manaMax: updatedNext.manaMax,
        manaAvailable: updatedNext.manaAvailable,
      },
    });
  }

  // Chain the draw. Decking-out lands here too — its winner + log
  // entry are folded into this action's result.
  const draw = executeDrawCard(s, nextSide);
  return { next: draw.next, logs: [...logs, ...draw.logs] };
}

/**
 * Resolve a single attack from the current `state.turn` side. The
 * caller can pass a `blockerId` to target a creature on the
 * defending side, or `null` to swing at face (only legal when the
 * defender has no creatures, per house rule in canAttackFace).
 */
export function executeAttack(
  state: IGameState,
  attackerId: CardId,
  blockerId: CardId | null,
): ActionResult {
  if (state.winner) return noop(state);
  const attackingSide = state.turn;
  const defendingSide: PlayerId = attackingSide === 'player' ? 'opponent' : 'player';
  const attacker = state[attackingSide].battlefield.find((c) => c.id === attackerId);
  if (!attacker) return noop(state);

  if (!canAttack(attacker)) {
    if (attackingSide !== 'player') return noop(state);
    const reason = attacker.summoningSick
      ? 'has summoning sickness'
      : 'has already attacked this turn';
    return {
      next: state,
      logs: [
        {
          message: `${attacker.name} ${reason} and cannot attack.`,
          priority: 'polite',
          kind: 'info',
        },
      ],
    };
  }

  const blocker = blockerId
    ? (state[defendingSide].battlefield.find((c) => c.id === blockerId) ?? null)
    : null;

  if (!blocker && !canAttackFace(state[defendingSide])) {
    if (attackingSide !== 'player') return noop(state);
    return {
      next: state,
      logs: [
        {
          message: 'Cannot attack directly while the opponent has creatures on the battlefield.',
          priority: 'polite',
          kind: 'info',
        },
      ],
    };
  }

  const result = resolveCombat(attacker, blocker);

  let attackerPlayer = state[attackingSide];
  let defenderPlayer = state[defendingSide];

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

  let next = setPlayerSlice(state, attackingSide, attackerPlayer);
  next = setPlayerSlice(next, defendingSide, defenderPlayer);
  if (winner) next = { ...next, winner };

  const who = attackingSide === 'player' ? 'You' : 'Opponent';
  const logs: ActionLogSeed[] = [];
  if (blocker) {
    logs.push({
      message: `${who} attacked with ${shortCardLabel(attacker)}, blocked by ${shortCardLabel(
        blocker,
      )}. ${result.attackerDies ? `${attacker.name} dies. ` : ''}${
        result.blockerDies ? `${blocker.name} dies.` : ''
      }`.trim(),
      priority: 'assertive',
      kind: 'combat',
      meta: {
        attackingSide,
        attacker: attacker.name,
        blocker: blocker.name,
        attackerDies: result.attackerDies ? 1 : 0,
        blockerDies: result.blockerDies ? 1 : 0,
      },
    });
  } else {
    logs.push({
      message: `${who} attacked with ${shortCardLabel(attacker)}, dealing ${
        result.playerDamage
      } damage. ${defendingSide === 'player' ? 'Your' : "Opponent's"} life is now ${
        defenderPlayer.life
      }.`,
      priority: 'assertive',
      kind: 'combat',
      meta: {
        attackingSide,
        attacker: attacker.name,
        damage: result.playerDamage,
        defenderLife: defenderPlayer.life,
      },
    });
  }

  if (winner) {
    logs.push({
      message:
        winner === 'player'
          ? 'Victory! You defeated the opponent.'
          : 'Defeat. The opponent reduced your life to zero.',
      priority: 'assertive',
      kind: 'game-over',
      meta: { winner },
    });
  }

  return { next, logs };
}
