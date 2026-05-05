import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Visual regression: three pixel-stable surfaces caught on the same
 * deterministic build (`NEXT_PUBLIC_MTG_DETERMINISTIC=1`):
 *   1. color-selection landing
 *   2. in-game initial state (player turn 1, hand of 5, empty boards)
 *   3. card inspector dialog open over the in-game surface
 *
 * Determinism comes from three pinned inputs:
 *   - Scryfall short-circuited to the fallback deck
 *   - opponent color forced to the alphabetical-first non-player option
 *     (player picks Red → opponent is Black)
 *   - art fetch returns empty so colored swatches render instead of
 *     network-loaded crops
 *
 * Baselines are platform-suffixed by Playwright (`*-linux.png`,
 * `*-win32.png`, etc.) so each OS has its own truth file. CI runs
 * Linux only; local dev on other OSes can opt in via `npm run
 * test:visual`.
 */

const VIEWPORT = { width: 1280, height: 800 } as const;

async function pickRed(page: Page) {
  await page.getByRole('button', { name: /Vermelho|Red/ }).click();
}

async function settle(page: Page) {
  // Hand of 5 + first opponent battlefield slot are the last DOM nodes
  // to mount after deck assembly. Once cards exist the layout is final.
  await expect(page.locator('[data-card-id]')).toHaveCount(5, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function maskLiveRegions(page: Page): Promise<Locator[]> {
  // Live regions hold transient announcement text that varies in
  // timing across runs. Mask them out of the screenshot so the diff
  // doesn't trip on a still-rendering polite update.
  return [page.locator('[aria-live="polite"]'), page.locator('[aria-live="assertive"]')];
}

test.describe('visual', () => {
  test.use({ viewport: VIEWPORT });

  test('color selection landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Vermelho|Red/ })).toBeVisible();
    // No live announcements on this surface yet, but masking is cheap
    // and future-proof against a localized banner being added later.
    const masks = await maskLiveRegions(page);
    await expect(page).toHaveScreenshot('color-selection.png', { mask: masks, fullPage: true });
  });

  test('in-game initial state', async ({ page }) => {
    await page.goto('/');
    await pickRed(page);
    await settle(page);
    const masks = await maskLiveRegions(page);
    await expect(page).toHaveScreenshot('in-game-initial.png', { mask: masks, fullPage: true });
  });

  test('inspector dialog open over in-game surface', async ({ page }) => {
    await page.goto('/');
    await pickRed(page);
    await settle(page);

    // Hand cards render `motion.button` with [data-card-id] directly,
    // so click the first one. onActivate routes to openInspector('hand').
    await page.locator('[data-card-id]').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Initial focus lands on the dialog's first focusable button, not
    // the dialog wrapper itself — assert focus is inside the dialog.
    await expect(dialog.locator(':focus')).toHaveCount(1);

    const masks = await maskLiveRegions(page);
    await expect(page).toHaveScreenshot('inspector-open.png', { mask: masks, fullPage: true });
  });
});
