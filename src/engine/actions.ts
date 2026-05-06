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
 *   - `logs`: announcer entry seeds — { template, vars }, priority,
 *     kind, meta. The store maps these through its log() helper to
 *     mint full LogEntry records: it resolves the template against the
 *     current language via the i18n messages dictionary, formats the
 *     vars, and stamps id + timestamp.
 *
 * The contract surface is the (template, vars) pair. The equivalence
 * snapshot in src/store/useGameStore.equivalence.test.ts pins those
 * along with the resolved message string for stability — any copy
 * change in messages.ts shows up as a snapshot diff that has to be
 * accepted in the same commit (ADR 0006).
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
import type { MessageKey } from '@/i18n/messages';

export interface ActionLogSeed {
  template: MessageKey;
  vars?: Record<string, string | number>;
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
          template: 'log.cannotPlay.mana',
          vars: { name: card.name, cmc: card.cmc, available: state[who].manaAvailable },
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
        template: who === 'player' ? 'log.play.player' : 'log.play.opponent',
        vars: { label },
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
          template: who === 'player' ? 'log.decking.player' : 'log.decking.opponent',
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
          template: 'log.draw.player',
          vars: { name: drawn.name, handSize: updated.hand.length },
          priority: 'polite',
          kind: 'draw',
          meta: { player: 'player', card: drawn.name, handSize: updated.hand.length },
        }
      : {
          template: 'log.draw.opponent',
          vars: { handSize: updated.hand.length },
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
    nextSide === 'player'
      ? {
          template: 'log.turn.player',
          vars: { turnNumber: newTurnNumber },
          priority: 'polite',
          kind: 'turn',
          meta: { turnNumber: newTurnNumber, player: nextSide },
        }
      : {
          template: 'log.turn.opponent',
          priority: 'polite',
          kind: 'turn',
          meta: { turnNumber: newTurnNumber, player: nextSide },
        },
  ];
  if (nextSide === 'player') {
    logs.push({
      template: 'log.mana.available',
      vars: { manaMax: updatedNext.manaMax },
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
    return {
      next: state,
      logs: [
        {
          template: attacker.summoningSick ? 'log.attack.summoningSick' : 'log.attack.exhausted',
          vars: { name: attacker.name },
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
          template: 'log.attack.cannotAttackDirect',
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

  // For blocked combat templates the {who} placeholder is "You"/"Opponent"
  // depending on attackingSide. The store glue injects that — engine
  // doesn't know the active language, so it just emits meta.attackingSide.
  const logs: ActionLogSeed[] = [];
  if (blocker) {
    const blockedTemplate: MessageKey = result.attackerDies
      ? result.blockerDies
        ? 'log.combat.blocked.both'
        : 'log.combat.blocked.attackerOnly'
      : result.blockerDies
        ? 'log.combat.blocked.blockerOnly'
        : 'log.combat.blocked.none';
    logs.push({
      template: blockedTemplate,
      vars: {
        attackerLabel: shortCardLabel(attacker),
        blockerLabel: shortCardLabel(blocker),
        attackerName: attacker.name,
        blockerName: blocker.name,
      },
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
      template:
        attackingSide === 'player' ? 'log.combat.face.byPlayer' : 'log.combat.face.byOpponent',
      vars: {
        attackerLabel: shortCardLabel(attacker),
        damage: result.playerDamage,
        defenderLife: defenderPlayer.life,
      },
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
      template: winner === 'player' ? 'log.gameOver.victory' : 'log.gameOver.defeat',
      priority: 'assertive',
      kind: 'game-over',
      meta: { winner },
    });
  }

  return { next, logs };
}
