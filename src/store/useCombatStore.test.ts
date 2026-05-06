import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  IMPACT_MS,
  REDUCED_FLASH_MS,
  REDUCED_HOLD_MS,
  RETURN_MS,
  TRAVEL_MS,
} from '@/constants/timings';
import { useCombatStore } from './useCombatStore';
import type { CombatIntent } from './useCombatStore';

const intent = (overrides: Partial<CombatIntent> = {}): CombatIntent => ({
  attackerId: 'a1',
  targetId: 'b1',
  targetKind: 'creature',
  attackerDamage: 2,
  targetDamage: 2,
  attackerDies: false,
  targetDies: false,
  faceDamage: 0,
  ...overrides,
});

// runFull/runReduced execute their first synchronous set() inside the
// queueTail.then microtask, so we need to flush microtasks before
// observing the TRAVEL/flash phase. advanceTimersByTimeAsync(0) drains
// the microtask queue without advancing fake setTimeout.
const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0);

describe('useCombatStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // reset() preserves reducedMotion deliberately, so we have to clear it
    // first to keep tests isolated when an earlier test flipped it on.
    useCombatStore.setState({ reducedMotion: false });
    useCombatStore.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  it('toggles isAnimating during playCombat', async () => {
    const { playCombat } = useCombatStore.getState();
    expect(useCombatStore.getState().isAnimating).toBe(false);
    const promise = playCombat(intent());
    expect(useCombatStore.getState().isAnimating).toBe(true);
    await vi.advanceTimersByTimeAsync(1200);
    await promise;
    expect(useCombatStore.getState().isAnimating).toBe(false);
  });

  it('serializes calls: second playCombat waits for the first', async () => {
    const { playCombat } = useCombatStore.getState();
    const order: string[] = [];
    const p1 = playCombat(intent({ attackerId: 'A' })).then(() => order.push('A'));
    const p2 = playCombat(intent({ attackerId: 'B' })).then(() => order.push('B'));

    await vi.advanceTimersByTimeAsync(1200);
    await p1;
    expect(order).toEqual(['A']);
    await vi.advanceTimersByTimeAsync(1200);
    await p2;
    expect(order).toEqual(['A', 'B']);
  });

  it('reduced-motion path resolves within 600ms', async () => {
    const { playCombat } = useCombatStore.getState();
    useCombatStore.setState({ reducedMotion: true });
    const start = Date.now();
    const p = playCombat(intent());
    await vi.advanceTimersByTimeAsync(600);
    await p;
    expect(Date.now() - start).toBeLessThanOrEqual(650);
  });

  it('sets lifePulse to player when AI face-hits the player', async () => {
    const { playCombat } = useCombatStore.getState();
    const statesSeen: Array<'player' | 'opponent' | null> = [];
    const unsubscribe = useCombatStore.subscribe((state) => {
      statesSeen.push(state.lifePulse);
    });

    const p = playCombat(
      intent({
        targetId: 'player-life',
        targetKind: 'face',
        faceDamage: 3,
        attackerDamage: 0,
        targetDamage: 0,
        attackerDies: false,
        targetDies: false,
      }),
    );
    await vi.advanceTimersByTimeAsync(1200);
    await p;
    unsubscribe();

    // At some point during the animation the pulse should have been 'player'.
    expect(statesSeen).toContain('player');
  });

  it('sets lifePulse to opponent when player face-hits the opponent', async () => {
    const { playCombat } = useCombatStore.getState();
    const statesSeen: Array<'player' | 'opponent' | null> = [];
    const unsubscribe = useCombatStore.subscribe((state) => {
      statesSeen.push(state.lifePulse);
    });

    const p = playCombat(
      intent({
        targetId: 'opponent-life',
        targetKind: 'face',
        faceDamage: 3,
        attackerDamage: 0,
        targetDamage: 0,
        attackerDies: false,
        targetDies: false,
      }),
    );
    await vi.advanceTimersByTimeAsync(1200);
    await p;
    unsubscribe();

    expect(statesSeen).toContain('opponent');
  });

  it('full-motion path resolves within 1100ms', async () => {
    const { playCombat } = useCombatStore.getState();
    const start = Date.now();
    const p = playCombat(intent());
    await vi.advanceTimersByTimeAsync(1100);
    await p;
    expect(Date.now() - start).toBeLessThanOrEqual(1150);
  });

  it('reset clears queue and state', async () => {
    const { playCombat, reset } = useCombatStore.getState();
    playCombat(intent());
    reset();
    expect(useCombatStore.getState().isAnimating).toBe(false);
    expect(useCombatStore.getState().flight).toBeNull();
  });

  it('INITIAL state is empty arrays + null flight/lifePulse + isAnimating false', () => {
    const s = useCombatStore.getState();
    expect(s.flight).toBeNull();
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual([]);
    expect(s.damageNumbers).toEqual([]);
    expect(s.lifePulse).toBeNull();
    expect(s.isAnimating).toBe(false);
  });

  it('reset preserves reducedMotion, restores everything else to INITIAL', () => {
    useCombatStore.setState({
      flight: { attackerId: 'x', targetId: 'y', targetKind: 'creature' },
      impactIds: ['x', 'y'],
      deathIds: ['z'],
      damageNumbers: [{ id: 't', anchorId: 'y', value: 5 }],
      lifePulse: 'player',
      reducedMotion: true,
    });
    useCombatStore.getState().reset();
    const s = useCombatStore.getState();
    expect(s.flight).toBeNull();
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual([]);
    expect(s.damageNumbers).toEqual([]);
    expect(s.lifePulse).toBeNull();
    expect(s.reducedMotion).toBe(true);
  });

  it('full-motion creature combat emits TRAVEL → IMPACT → RETURN → reset with exact state per phase', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'B',
        targetKind: 'creature',
        attackerDamage: 2,
        targetDamage: 3,
        attackerDies: false,
        targetDies: true,
        faceDamage: 0,
      }),
    );

    // TRAVEL phase: flight populated, every other animation field cleared.
    await flushMicrotasks();
    let s = useCombatStore.getState();
    expect(s.flight).toEqual({ attackerId: 'A', targetId: 'B', targetKind: 'creature' });
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual([]);
    expect(s.damageNumbers).toEqual([]);
    expect(s.lifePulse).toBeNull();

    // IMPACT phase: both attacker + target light up, damage numbers carry exact ids/values.
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    s = useCombatStore.getState();
    expect(s.impactIds).toEqual(['A', 'B']);
    expect(s.damageNumbers).toEqual([
      { id: 't', anchorId: 'B', value: 3 },
      { id: 'a', anchorId: 'A', value: 2 },
    ]);
    expect(s.lifePulse).toBeNull();

    // RETURN phase: impacts clear, deaths surface — only target dies here.
    await vi.advanceTimersByTimeAsync(IMPACT_MS);
    s = useCombatStore.getState();
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual(['B']);

    // Final reset.
    await vi.advanceTimersByTimeAsync(RETURN_MS);
    await p;
    s = useCombatStore.getState();
    expect(s.flight).toBeNull();
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual([]);
    expect(s.damageNumbers).toEqual([]);
    expect(s.lifePulse).toBeNull();
    expect(s.isAnimating).toBe(false);
  });

  it('creature combat with both dying surfaces both ids in deathIds during RETURN', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({ attackerId: 'A', targetId: 'B', attackerDies: true, targetDies: true }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS + IMPACT_MS);
    expect(useCombatStore.getState().deathIds).toEqual(['A', 'B']);
    await vi.advanceTimersByTimeAsync(RETURN_MS);
    await p;
  });

  it('creature combat with only attacker dying surfaces only attacker in deathIds', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({ attackerId: 'A', targetId: 'B', attackerDies: true, targetDies: false }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS + IMPACT_MS);
    expect(useCombatStore.getState().deathIds).toEqual(['A']);
    await vi.advanceTimersByTimeAsync(RETURN_MS);
    await p;
  });

  it('creature combat with no damage produces empty damageNumbers', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(intent({ attackerDamage: 0, targetDamage: 0 }));
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    expect(useCombatStore.getState().damageNumbers).toEqual([]);
    await vi.advanceTimersByTimeAsync(IMPACT_MS + RETURN_MS);
    await p;
  });

  it('creature combat with only target damage emits a single target damage number', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({ attackerId: 'A', targetId: 'B', attackerDamage: 0, targetDamage: 4 }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    expect(useCombatStore.getState().damageNumbers).toEqual([{ id: 't', anchorId: 'B', value: 4 }]);
    await vi.advanceTimersByTimeAsync(IMPACT_MS + RETURN_MS);
    await p;
  });

  it('creature combat with only attacker damage emits a single attacker damage number', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({ attackerId: 'A', targetId: 'B', attackerDamage: 5, targetDamage: 0 }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    expect(useCombatStore.getState().damageNumbers).toEqual([{ id: 'a', anchorId: 'A', value: 5 }]);
    await vi.advanceTimersByTimeAsync(IMPACT_MS + RETURN_MS);
    await p;
  });

  it('face hit emits face damage number, single-id impact, and lifePulse on the defending side', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'opponent-life',
        targetKind: 'face',
        attackerDamage: 0,
        targetDamage: 0,
        faceDamage: 7,
      }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    const s = useCombatStore.getState();
    expect(s.impactIds).toEqual(['A']);
    expect(s.damageNumbers).toEqual([{ id: 'f', anchorId: 'opponent-life', value: 7 }]);
    expect(s.lifePulse).toBe('opponent');
    await vi.advanceTimersByTimeAsync(IMPACT_MS);
    expect(useCombatStore.getState().deathIds).toEqual([]);
    await vi.advanceTimersByTimeAsync(RETURN_MS);
    await p;
  });

  it('face hit on player-life sets lifePulse to player', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'player-life',
        targetKind: 'face',
        attackerDamage: 0,
        targetDamage: 0,
        faceDamage: 2,
      }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    expect(useCombatStore.getState().lifePulse).toBe('player');
    await vi.advanceTimersByTimeAsync(IMPACT_MS + RETURN_MS);
    await p;
  });

  it('face hit with zero faceDamage produces no damageNumbers', async () => {
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'opponent-life',
        targetKind: 'face',
        attackerDamage: 0,
        targetDamage: 0,
        faceDamage: 0,
      }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS);
    expect(useCombatStore.getState().damageNumbers).toEqual([]);
    await vi.advanceTimersByTimeAsync(IMPACT_MS + RETURN_MS);
    await p;
  });

  it('face hit never surfaces target id in deathIds even when targetDies is true', async () => {
    // targetDies on a face hit is meaningless, but defensively the store must
    // still skip the targetId because there is no creature card to remove.
    const { playCombat } = useCombatStore.getState();
    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'opponent-life',
        targetKind: 'face',
        attackerDies: false,
        targetDies: true,
        faceDamage: 1,
      }),
    );
    await vi.advanceTimersByTimeAsync(TRAVEL_MS + IMPACT_MS);
    expect(useCombatStore.getState().deathIds).toEqual([]);
    await vi.advanceTimersByTimeAsync(RETURN_MS);
    await p;
  });

  it('reduced-motion creature combat emits FLASH → HOLD → reset with exact state', async () => {
    const { playCombat } = useCombatStore.getState();
    useCombatStore.setState({ reducedMotion: true });

    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'B',
        targetKind: 'creature',
        attackerDamage: 1,
        targetDamage: 4,
        attackerDies: false,
        targetDies: true,
      }),
    );

    // FLASH phase: impactIds + damageNumbers populated immediately, no TRAVEL.
    await flushMicrotasks();
    let s = useCombatStore.getState();
    expect(s.impactIds).toEqual(['A', 'B']);
    expect(s.damageNumbers).toEqual([
      { id: 't', anchorId: 'B', value: 4 },
      { id: 'a', anchorId: 'A', value: 1 },
    ]);
    expect(s.lifePulse).toBeNull();
    expect(s.flight).toBeNull();

    // After REDUCED_FLASH_MS: impacts clear, deathIds surfaces.
    await vi.advanceTimersByTimeAsync(REDUCED_FLASH_MS);
    s = useCombatStore.getState();
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual(['B']);

    // After remaining hold: full reset.
    await vi.advanceTimersByTimeAsync(REDUCED_HOLD_MS - REDUCED_FLASH_MS);
    await p;
    s = useCombatStore.getState();
    expect(s.flight).toBeNull();
    expect(s.impactIds).toEqual([]);
    expect(s.deathIds).toEqual([]);
    expect(s.damageNumbers).toEqual([]);
    expect(s.lifePulse).toBeNull();
    expect(s.isAnimating).toBe(false);
  });

  it('reduced-motion face hit on player-life sets lifePulse to player during FLASH', async () => {
    const { playCombat } = useCombatStore.getState();
    useCombatStore.setState({ reducedMotion: true });
    const p = playCombat(
      intent({
        attackerId: 'A',
        targetId: 'player-life',
        targetKind: 'face',
        attackerDamage: 0,
        targetDamage: 0,
        faceDamage: 3,
      }),
    );
    await flushMicrotasks();
    const s = useCombatStore.getState();
    expect(s.impactIds).toEqual(['A']);
    expect(s.damageNumbers).toEqual([{ id: 'f', anchorId: 'player-life', value: 3 }]);
    expect(s.lifePulse).toBe('player');
    await vi.advanceTimersByTimeAsync(REDUCED_HOLD_MS);
    await p;
  });

  it('does not poison the queue if the animation throws', async () => {
    const { playCombat } = useCombatStore.getState();
    // Patch setState to throw on the first invocation, then restore itself.
    const originalSet = useCombatStore.setState;
    let thrown = false;
    useCombatStore.setState = (partial: unknown) => {
      if (!thrown) {
        thrown = true;
        useCombatStore.setState = originalSet;
        throw new Error('simulated');
      }
      return originalSet(partial as never);
    };

    // First call should reject; catch so the test itself doesn't fail on that.
    const p1 = playCombat(intent()).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1200);
    await p1;
    // Ensure setState is restored in case the thrown branch didn't run.
    useCombatStore.setState = originalSet;

    // Second call should succeed normally - queue was not poisoned.
    const p2 = playCombat(intent({ attackerId: 'second' }));
    await vi.advanceTimersByTimeAsync(1200);
    await p2;
    expect(useCombatStore.getState().isAnimating).toBe(false);
  });
});
