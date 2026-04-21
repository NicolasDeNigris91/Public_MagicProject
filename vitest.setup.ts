import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';

// Enable expect(results).toHaveNoViolations() in component tests.
expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
});
