import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedData } from './media';

describe('prefersReducedData', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns true when the media query matches', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: q === '(prefers-reduced-data: reduce)',
          media: q,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    expect(prefersReducedData()).toBe(true);
  });

  it('returns false when the media query does not match', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: false,
          media: q,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    expect(prefersReducedData()).toBe(false);
  });

  it('returns false when matchMedia is unavailable (older browsers / SSR shims)', () => {
    const original = window.matchMedia;
    // Simulate a UA that doesn't expose matchMedia at all. The
    // helper must short-circuit instead of throwing.
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
    try {
      expect(prefersReducedData()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
