import { create } from 'zustand';
import {
  IMPACT_MS,
  REDUCED_FLASH_MS,
  REDUCED_HOLD_MS,
  RETURN_MS,
  TRAVEL_MS,
} from '@/constants/timings';

export type TargetKind = 'creature' | 'face';

export interface CombatIntent {
  attackerId: string;
  targetId: string; // creature id OR 'opponent-life' / 'player-life' for face
  targetKind: TargetKind;
  attackerDamage: number; // dealt to attacker by blocker (0 on face hits)
  targetDamage: number; // dealt to blocker by attacker (0 on face hits)
  attackerDies: boolean;
  targetDies: boolean;
  faceDamage: number; // damage to defending player (0 on creature combat)
}

export interface DamageNumber {
  id: string;
  anchorId: string;
  value: number;
}

interface CombatVisualState {
  flight: { attackerId: string; targetId: string; targetKind: TargetKind } | null;
  impactIds: string[];
  deathIds: string[];
  damageNumbers: DamageNumber[];
  lifePulse: 'player' | 'opponent' | null;
  isAnimating: boolean;
  reducedMotion: boolean;
}

interface CombatActions {
  playCombat: (intent: CombatIntent) => Promise<void>;
  reset: () => void;
}

type CombatStore = CombatVisualState & CombatActions;

const INITIAL: CombatVisualState = {
  flight: null,
  impactIds: [],
  deathIds: [],
  damageNumbers: [],
  lifePulse: null,
  isAnimating: false,
  reducedMotion: false,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const useCombatStore = create<CombatStore>((set, get) => {
  // Serial queue - each call chains onto the previous promise so
  // animations never overlap, even if callers fire them back-to-back.
  let queueTail: Promise<void> = Promise.resolve();

  const buildDamageNumbers = (intent: CombatIntent): DamageNumber[] => {
    if (intent.targetKind === 'creature') {
      const out: DamageNumber[] = [];
      if (intent.targetDamage > 0)
        out.push({ id: 't', anchorId: intent.targetId, value: intent.targetDamage });
      if (intent.attackerDamage > 0)
        out.push({ id: 'a', anchorId: intent.attackerId, value: intent.attackerDamage });
      return out;
    }
    return intent.faceDamage > 0
      ? [{ id: 'f', anchorId: intent.targetId, value: intent.faceDamage }]
      : [];
  };

  const buildDeathIds = (intent: CombatIntent): string[] => {
    const out: string[] = [];
    if (intent.attackerDies) out.push(intent.attackerId);
    if (intent.targetDies && intent.targetKind === 'creature') out.push(intent.targetId);
    return out;
  };

  const runFull = async (intent: CombatIntent) => {
    const damageNumbers = buildDamageNumbers(intent);

    set({
      flight: {
        attackerId: intent.attackerId,
        targetId: intent.targetId,
        targetKind: intent.targetKind,
      },
      impactIds: [],
      deathIds: [],
      damageNumbers: [],
      lifePulse: null,
    });
    await sleep(TRAVEL_MS);

    const impactIds =
      intent.targetKind === 'creature' ? [intent.attackerId, intent.targetId] : [intent.attackerId];
    set({
      impactIds,
      damageNumbers,
      lifePulse:
        intent.targetKind === 'face'
          ? intent.targetId === 'player-life'
            ? 'player'
            : 'opponent'
          : null,
    });
    await sleep(IMPACT_MS);

    const deathIds = buildDeathIds(intent);
    set({ impactIds: [], deathIds });
    await sleep(RETURN_MS);

    set({ flight: null, deathIds: [], damageNumbers: [], lifePulse: null });
  };

  const runReduced = async (intent: CombatIntent) => {
    const damageNumbers = buildDamageNumbers(intent);
    set({
      impactIds:
        intent.targetKind === 'creature'
          ? [intent.attackerId, intent.targetId]
          : [intent.attackerId],
      damageNumbers,
      lifePulse:
        intent.targetKind === 'face'
          ? intent.targetId === 'player-life'
            ? 'player'
            : 'opponent'
          : null,
    });
    await sleep(REDUCED_FLASH_MS);
    set({ impactIds: [] });
    const deathIds = buildDeathIds(intent);
    set({ deathIds });
    await sleep(REDUCED_HOLD_MS - REDUCED_FLASH_MS);
    set({ flight: null, impactIds: [], deathIds: [], damageNumbers: [], lifePulse: null });
  };

  return {
    ...INITIAL,

    playCombat: (intent) => {
      // Flip synchronously so callers can observe isAnimating immediately,
      // and so it remains true across the whole queued span.
      set({ isAnimating: true });
      const task: Promise<void> = queueTail.then(async () => {
        try {
          const { reducedMotion } = get();
          if (reducedMotion) await runReduced(intent);
          else await runFull(intent);
        } finally {
          // Only clear isAnimating when queue is drained.
          // The guard below checks if this is the last task.
          queueMicrotask(() => {
            const s = get();
            if (!s.isAnimating) return;
            // If nothing else chained, queueTail === this task's promise (caught form).
            if (queueTail === caught) set({ isAnimating: false });
          });
        }
      });
      // Keep the internal queue chain resolvable so a throw here doesn't
      // poison every subsequent playCombat. Callers still observe rejections
      // on the returned `task` promise.
      const caught = task.catch(() => undefined);
      queueTail = caught;
      return task;
    },

    reset: () => {
      queueTail = Promise.resolve();
      set({ ...INITIAL, reducedMotion: get().reducedMotion });
    },
  };
});
