import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke flow: pick color → wait for game → end opponent's turn → axe.
 *
 * The deck fetch is mocked so the test is hermetic and fast: we serve
 * the same fallback shape the app accepts so play loop reaches the
 * "your turn, your hand has 5 cards" steady state.
 */

async function pickColor(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).click();
}

test.describe('smoke', () => {
  test('color pick lands on a playable game state', async ({ page }) => {
    await page.goto('/');
    await pickColor(page, /Vermelho|Red/);

    // Skeleton first, then the real heading sits at h1.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

    // Both players' headers exist as h2s with the localized labels.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2, { timeout: 30_000 });

    // Hand shows 5 cards.
    const cards = page.locator('[data-card-id]');
    await expect(cards).toHaveCount(5, { timeout: 30_000 });
  });

  test('combat log toggle responds to L', async ({ page }, testInfo) => {
    // Keyboard shortcut is a desktop-only UX affordance — there is no
    // physical L key on the iPhone 13 / Pixel 5 emulations and the
    // virtual keyboard isn't surfaced for non-input contexts. The
    // touch path opens the log via the toggle button instead and is
    // covered by the click-driven flow. Desktop firefox/webkit DO
    // run this so we catch Gecko/WebKit-specific keydown dispatch
    // differences.
    test.skip(
      testInfo.project.name.startsWith('mobile-'),
      'Keyboard shortcut not part of the mobile contract',
    );
    await page.goto('/');
    await pickColor(page, /Vermelho|Red/);
    await expect(page.locator('[data-card-id]').first()).toBeVisible({ timeout: 30_000 });

    // Anchor by aria-controls — the localized label flips between
    // "Abrir/Open registro/log" and "Fechar/Close ..." as the panel
    // toggles, so a name-based locator would lose the element after
    // the first press.
    const toggle = page.locator('button[aria-controls="match-log"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('l');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('l');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('axe sweep on the in-game surface has no serious violations', async ({ page }) => {
    await page.goto('/');
    await pickColor(page, /Vermelho|Red/);
    await expect(page.locator('[data-card-id]').first()).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Surface findings on failure rather than just the count so a
    // regression PR shows the rule + selector right in the test output.
    expect(
      results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    ).toEqual([]);
  });

  test('axe sweep on the color-selection surface has no violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Vermelho|Red/ })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(
      results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    ).toEqual([]);
  });
});
