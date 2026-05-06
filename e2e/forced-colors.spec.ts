import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Forced-colors / Windows High Contrast smoke. Uses
 * page.emulateMedia({ forcedColors: 'active' }) so the OS-equivalent
 * color stripping kicks in before navigation. The intent is to catch
 * regressions where a semantic affordance (focus ring, win/loss
 * border, damage flash) is conveyed only via a hex color the OS
 * would erase. Real assistive-tech testing (NVDA/JAWS) is still
 * user-blocked; this is the cheapest CI guardrail we have.
 */
test.describe('forced-colors', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'forced-colors emulation only honored by chromium today',
  );

  test('color pick + axe pass under HCM emulation', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    await page.getByRole('button', { name: /Vermelho|Red/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-card-id]')).toHaveCount(5, { timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(
      results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    ).toEqual([]);
  });
});
