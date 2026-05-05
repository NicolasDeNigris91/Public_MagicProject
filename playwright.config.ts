import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke + axe sweep against the production build.
 *
 * Single chromium project keeps CI fast — engine logic is already
 * covered by 138 unit/property tests, so e2e exists to catch
 * integration failures (route/CSP/hydration) and live a11y
 * violations the JSDOM-based axe sweep can't see (focus order,
 * computed contrast, real ARIA tree).
 *
 * `webServer` builds and serves the app the same way prod does so we
 * test the actual artifact, not the dev server.
 */
export default defineConfig({
  testDir: 'e2e',
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start -- -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
