import { expect, test, type Page } from '@playwright/test';

/**
 * Real-browser checks for the two modal surfaces with focus traps:
 * KeyboardHelp (the ? overlay) and CardInspector. Unit tests assert
 * the trap behavior in jsdom — these specs catch the kinds of issues
 * jsdom can't see: hydrated keyboard event dispatch, real ARIA
 * attribute resolution, browser-engine-specific Tab order quirks.
 *
 * GameOverDialog is omitted: reaching the winner state from a fresh
 * load means playing through a full match (10+ turns, AI dependent).
 * Unit + integration coverage already pins its focus behavior.
 */

async function pickColor(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).click();
}

async function landOnGame(page: Page) {
  await page.goto('/');
  await pickColor(page, /Vermelho|Red/);
  await expect(page.locator('[data-card-id]').first()).toBeVisible({ timeout: 30_000 });
}

test.describe('keyboard help dialog', () => {
  test('opens via the header ? button on every project (mouse + touch path)', async ({ page }) => {
    await landOnGame(page);
    // The button has aria-keyshortcuts="?", visible label is just "?".
    // Anchor by accessible name.
    const helpBtn = page.getByRole('button', {
      name: /Mostrar atalhos|Show keyboard|Mostrar atajos|Afficher les raccourcis/,
    });
    await helpBtn.click();
    const dialog = page.getByRole('dialog', {
      name: /Atalhos de teclado|Keyboard shortcuts|Atajos de teclado|Raccourcis clavier/,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Close button is the only focusable inside; auto-focus lands on
    // it. Click it to close.
    const closeBtn = dialog.getByRole('button', {
      name: /Fechar atalhos|Close shortcuts|Cerrar atajos|Fermer les raccourcis/,
    });
    await expect(closeBtn).toBeFocused();
    await closeBtn.click();
    await expect(dialog).toHaveCount(0);
  });

  test('opens via "?" key, closes on Escape (desktop only)', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile-'),
      'Keyboard shortcut not part of the mobile contract',
    );
    await landOnGame(page);
    // Focus must be on something that won't intercept "?" — the body
    // works since the global keydown handler reads from window, not a
    // specific element.
    await page.keyboard.press('Shift+/');
    const dialog = page.getByRole('dialog', {
      name: /Atalhos de teclado|Keyboard shortcuts|Atajos de teclado|Raccourcis clavier/,
    });
    await expect(dialog).toBeVisible();
    // Auto-focus lands on close button so Escape from the trap-bound
    // window listener fires onClose.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('card inspector dialog', () => {
  test('opens via the inline "ⓘ" button on a card and traps Tab', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile-'),
      "Tab cycle is a keyboard-driven flow; mobile virtual keyboards don't emit Tab",
    );
    await landOnGame(page);
    // The first card in the player's hand has the inspect button on
    // hover/focus. Hover the card to reveal it, then click.
    const firstCard = page.locator('[data-card-id]').first();
    await firstCard.hover();
    // The "ⓘ" buttons are aria-labelled "Inspecionar X" / "Inspect X".
    // Click the one closest to the focused hand card.
    const inspectButtons = page.getByRole('button', {
      name: /Inspecionar|Inspect|Inspeccionar|Inspecter/,
    });
    await inspectButtons.first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Tab cycle: there are typically 2 actions inside the inspector
    // dialog (play + close, or attack/deselect + close). Pressing Tab
    // from the last must wrap to the first; pressing Shift+Tab from
    // the first must wrap to the last. We don't depend on a specific
    // count — only on the cycle property.
    const buttonsInside = dialog.getByRole('button');
    const count = await buttonsInside.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Auto-focus lands on the first focusable. Tab `count` times: we
    // should land back on the original focus target.
    const initiallyFocused = await dialog.evaluate((el) =>
      document.activeElement && el.contains(document.activeElement)
        ? ((document.activeElement as HTMLElement).getAttribute('aria-label') ??
          (document.activeElement as HTMLElement).textContent)
        : null,
    );
    expect(initiallyFocused).toBeTruthy();
    for (let i = 0; i < count; i++) await page.keyboard.press('Tab');
    const afterCycle = await dialog.evaluate((el) =>
      document.activeElement && el.contains(document.activeElement)
        ? ((document.activeElement as HTMLElement).getAttribute('aria-label') ??
          (document.activeElement as HTMLElement).textContent)
        : null,
    );
    expect(afterCycle).toBe(initiallyFocused);
  });

  test('Escape closes the inspector and dialog disappears', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile-'),
      "Escape is a keyboard-driven flow; mobile virtual keyboards don't emit it",
    );
    await landOnGame(page);
    const firstCard = page.locator('[data-card-id]').first();
    await firstCard.hover();
    await page
      .getByRole('button', { name: /Inspecionar|Inspect|Inspeccionar|Inspecter/ })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
