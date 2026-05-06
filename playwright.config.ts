import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke + axe sweep against the production build.
 *
 * Five projects: desktop chromium / firefox / webkit, plus two mobile
 * emulations (iPhone 13 / WebKit and Pixel 5 / Chromium). Mobile
 * coverage exists to catch viewport-driven regressions the desktop
 * runs can't see — touch activation on color buttons, virtual-keyboard
 * reflow, and the small-screen tap-target audit through axe. Desktop
 * Firefox and WebKit catch engine-specific layout/keyboard quirks
 * (event.key vs event.code dispatch, flexbox subgrid edge cases,
 * forced-colors emulation differences). Engine logic is already
 * covered by 360+ unit/property tests, so e2e is reserved for
 * integration failures (route/CSP/hydration) and the kinds of a11y
 * violations the JSDOM-based axe sweep can't see (focus order,
 * computed contrast, real ARIA tree).
 *
 * `webServer` builds and serves the app the same way prod does so we
 * test the actual artifact, not the dev server.
 */
export default defineConfig({
  testDir: 'e2e',
  // Visual regression has its own config (playwright.visual.config.ts)
  // because the prod build it serves needs NEXT_PUBLIC_MTG_DETERMINISTIC=1
  // baked in at compile time, which the smoke suite must not see.
  testIgnore: /visual\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Desktop firefox catches Gecko-specific keyboard event quirks
    // (event.key dispatch order, focus-visible heuristics) and
    // layout differences (flexbox flex-basis 0 vs auto resolution
    // is historically wobbly here).
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // Desktop webkit (Safari engine) catches Apple-only layout and
    // a11y bugs the chromium pass can't see — most painful in the
    // past: aria-modal focus trap behavior, dialog backdrop click
    // handling, and forced-colors emulation never quite matching
    // Chromium's. We do NOT skip the forced-colors spec here even
    // though webkit ignores the emulation flag — that spec is
    // chromium-only via test.skip; the rest of the smoke runs.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile emulations. hasTouch=true is what flips Playwright into
    // tap-style input; the device profiles set it but we surface the
    // intent here too.
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start -- -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
