import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/__a11y__/**',
        'src/types/**',
        'src/app/**',
        // Type-only declaration files — no executable code to cover.
        'src/engine/types.ts',
      ],
      // Engine and pure utils are the contract surface — high bar.
      // Components/hooks are exercised through engine flows, store
      // tests, and the a11y sweep; treat them as a softer floor that
      // we ratchet up over time. Numbers below reflect current floor;
      // any regression below them fails CI.
      thresholds: {
        // Ratcheted upward after engine/actions.ts extraction + pure
        // tests for it. Current per-file engine coverage is 100/93+
        // for rules/ai/color and 100/95+ for actions, so 99/93/100/99
        // is a guardrail just below current that prevents regression
        // without flagging routine refactors.
        'src/engine/**': { lines: 99, branches: 93, functions: 100, statements: 99 },
        'src/utils/**': { lines: 90, branches: 80, functions: 95, statements: 90 },
        'src/adapters/**': { lines: 85, branches: 80, functions: 90, statements: 85 },
        'src/services/fallback-deck.ts': { lines: 95, branches: 95, functions: 95, statements: 95 },
        // Hooks ratcheted after useAttackerSelection branch coverage
        // pass. Current floor is 93/85 lines/branches; the threshold
        // sits a hair below to absorb routine refactors but trip on
        // any real regression.
        'src/hooks/**': { lines: 90, branches: 82, functions: 95, statements: 90 },
      },
    },
  },
});
