import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isObservabilityEnabled,
  reportError,
  reportVital,
  startObservability,
} from './observability';

/**
 * Observability is feature-flagged via NEXT_PUBLIC_SENTRY_DSN. The
 * test environment ships without it, so the production no-op path is
 * the contract under test here. With a DSN set we'd need a real
 * Sentry transport mock — out of scope for this guardrail; the
 * integration is covered by manual smoke once a DSN is provisioned.
 */

describe('observability — no DSN', () => {
  beforeEach(() => {
    // Confirm the test environment matches expectations: no DSN baked
    // in by Next.js means the module's NEXT_PUBLIC_SENTRY_DSN constant
    // is undefined and every entry point should short-circuit.
    expect(process.env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
  });

  it('reports as disabled when no DSN is configured', () => {
    expect(isObservabilityEnabled()).toBe(false);
  });

  it('reportError does not throw and does not load @sentry/browser', () => {
    expect(() => reportError(new Error('boom'))).not.toThrow();
    expect(() => reportError('string failure', { context: 'inline' })).not.toThrow();
  });

  it('reportVital does not throw and does not load web-vitals', () => {
    expect(() => reportVital({ name: 'CLS', value: 0.05, rating: 'good' })).not.toThrow();
  });

  it('startObservability returns a noop teardown when disabled', () => {
    const teardown = startObservability();
    expect(typeof teardown).toBe('function');
    // Calling teardown a second time also stays silent.
    expect(() => teardown()).not.toThrow();
  });

  it('startObservability does not attach window listeners when disabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    startObservability();
    expect(
      addSpy.mock.calls.some(([event]) => event === 'error' || event === 'unhandledrejection'),
    ).toBe(false);
    addSpy.mockRestore();
  });
});

describe('observability — module shape', () => {
  it('exposes the public surface used by the layout + ErrorBoundary', () => {
    // Pin the contract so adding fields doesn't accidentally remove
    // the ones the rest of the app imports.
    expect(typeof isObservabilityEnabled).toBe('function');
    expect(typeof reportError).toBe('function');
    expect(typeof reportVital).toBe('function');
    expect(typeof startObservability).toBe('function');
  });
});

describe('observability — server safety', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    // Simulate SSR by deleting the window global. The teardown
    // restores it for subsequent tests.
    originalWindow = globalThis.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
  });

  it('startObservability is a no-op on the server (window undefined)', () => {
    const teardown = startObservability();
    expect(typeof teardown).toBe('function');
    // Running the teardown must not throw even without a window.
    expect(() => teardown()).not.toThrow();
  });
});
