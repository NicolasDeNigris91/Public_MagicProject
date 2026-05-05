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
        'src/engine/**': { lines: 95, branches: 90, functions: 90, statements: 95 },
        'src/utils/**': { lines: 90, branches: 80, functions: 95, statements: 90 },
        'src/adapters/**': { lines: 85, branches: 80, functions: 90, statements: 85 },
        'src/services/fallback-deck.ts': { lines: 95, branches: 95, functions: 95, statements: 95 },
      },
    },
  },
});
