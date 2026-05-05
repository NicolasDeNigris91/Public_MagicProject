import { defineConfig, devices } from '@playwright/test';

/**
 * Visual-regression sweep against the production build with the
 * deterministic flag set: fallback deck only, opponent color pinned,
 * no Scryfall art. Pixel-stable across runs.
 *
 * Lives in a separate config from `playwright.config.ts` because the
 * webServer command builds with `NEXT_PUBLIC_MTG_DETERMINISTIC=1`
 * inlined at compile time — that has to be set BEFORE `next build`
 * runs, so the same prod artifact can't serve both suites.
 *
 * `reducedMotion: 'reduce'` short-circuits framer-motion + the
 * skeleton shimmer animation so screenshots aren't sampled mid-frame.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /visual\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-visual' }]]
    : 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Tiny diff budget covers subpixel font hinting on identical
      // platforms; cross-OS drift gets its own baseline file via
      // Playwright's automatic platform suffix.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  // Snapshots live alongside tests under e2e/__screenshots__/<spec>/
  // so they ship as a normal commit, not buried under test output.
  snapshotPathTemplate: 'e2e/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'cross-env NEXT_PUBLIC_MTG_DETERMINISTIC=1 npm run build && cross-env NEXT_PUBLIC_MTG_DETERMINISTIC=1 npm run start -- -p 3101',
    url: 'http://127.0.0.1:3101',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
