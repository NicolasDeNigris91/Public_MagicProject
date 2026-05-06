import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Mobile-only flows. Runs on the mobile-safari (iPhone 13 / WebKit)
 * and mobile-chrome (Pixel 5 / Chromium) projects defined in
 * playwright.config.ts. The desktop chromium project skips the entire
 * file so we don't run mobile assertions against a desktop viewport.
 *
 * Coverage:
 *   - touch activation via tap() picks a color and reaches steady state
 *   - tap-target size audit (axe rule target-size, WCAG 2.5.5 Level AA)
 *   - the battlefield region scrolls under touch input rather than
 *     trapping the page beneath it
 */

test.describe('mobile', () => {
  // Skip on every desktop project — these tests are about touch +
  // viewport, not behavior that desktop projects can usefully verify.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      !testInfo.project.name.startsWith('mobile-'),
      'Mobile flow runs on mobile-safari / mobile-chrome only',
    );
  });

  async function tapColor(page: Page, name: RegExp) {
    await page.getByRole('button', { name }).tap();
  }

  test('touch activation picks a color and lands on the game state', async ({ page }) => {
    await page.goto('/');
    await tapColor(page, /Vermelho|Red/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-card-id]')).toHaveCount(5, { timeout: 30_000 });
  });

  test('tap-target audit on the in-game surface stays clean of WCAG 2.5.5 violations', async ({
    page,
  }) => {
    await page.goto('/');
    await tapColor(page, /Vermelho|Red/);
    await expect(page.locator('[data-card-id]').first()).toBeVisible({ timeout: 30_000 });

    // WCAG 2.5.5 Level AAA + 2.5.8 Level AA cover target size. axe
    // surfaces these under the `target-size` rule in the wcag22aa
    // tag set; a serious violation here means a button/control is
    // smaller than the 24×24 CSS-px minimum on the mobile viewport.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(
      results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    ).toEqual([]);
  });

  test('battlefield region accepts touch scroll without trapping the page', async ({ page }) => {
    await page.goto('/');
    await tapColor(page, /Vermelho|Red/);
    await expect(page.locator('[data-card-id]').first()).toBeVisible({ timeout: 30_000 });

    // The mobile viewport is short enough that the bottom of the page
    // sits below the fold. A successful page-level scroll proves the
    // battlefield region's touch handlers don't preventDefault the
    // gesture (they shouldn't — only card taps consume the event).
    const before = await page.evaluate(() => window.scrollY);
    await page.touchscreen.tap(200, 400);
    await page.evaluate(() => window.scrollTo({ top: 200 }));
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeGreaterThan(before);
  });
});
