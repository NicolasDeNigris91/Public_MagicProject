import 'vitest';

interface AxeMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module 'vitest' {
  // Vitest's Assertion / AsymmetricMatchersContaining are merged at
  // runtime; the empty extension is the documented pattern for
  // augmenting them with custom matchers. Disable the empty-extension
  // rule here only.
  /* eslint-disable @typescript-eslint/no-empty-object-type */
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-empty-object-type */
}
