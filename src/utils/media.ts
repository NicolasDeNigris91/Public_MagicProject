/**
 * SSR-safe check for the user's `prefers-reduced-data` setting.
 *
 * Treated as "false" outside the browser (server render, vitest in
 * Node mode without jsdom shim, etc.) so callers that gate network
 * work on this flag still proceed by default during SSR. The flag
 * is also `false` if the UA doesn't expose `matchMedia` at all.
 */
export function prefersReducedData(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-data: reduce)').matches;
}
