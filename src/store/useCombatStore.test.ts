import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('useCombatStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  it('does not poison the queue if the animation throws', async () => {
    const { playCombat } = useCombatStore.getState();
    // Patch setState to throw on the first invocation, then restore itself.
    const originalSet = useCombatStore.setState;
    let thrown = false;
    useCombatStore.setState = ((partial: unknown) => {
      if (!thrown) {
        thrown = true;
        useCombatStore.setState = originalSet;
        throw new Error('simulated');
      }
      return originalSet(partial as never);
    }) as typeof originalSet;

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
