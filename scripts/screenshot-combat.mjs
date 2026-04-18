import { chromium } from 'playwright';
import { resolve } from 'node:path';

const OUT = resolve(
  'C:/Users/Nicolas De Nigris/Desktop/MyPersonalWebSite/public/projects/magic',
);
const URL = process.env.MAGIC_URL ?? 'http://localhost:3002';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[page err]', m.text()); });

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForSelector('h1:has-text("MTG")');
await page.waitForFunction(
  () => !document.body.innerText.includes('Loading deck from Scryfall'),
  { timeout: 45_000 },
).catch(() => {});
await page.waitForTimeout(1500);

async function playFirstHandCard() {
  const card = page.locator('section[aria-label^="Your hand"] button[aria-label*="mana cost"]').first();
  if (!(await card.count())) return false;
  await card.click();
  const play = page.getByRole('button', { name: /play to field/i });
  try { await play.waitFor({ timeout: 3000 }); } catch { return false; }
  await play.click();
  await page.waitForTimeout(1200);
  return true;
}

async function endAndWait() {
  await page.getByRole('button', { name: /^end turn$/i }).click({ force: true });
  await page.waitForFunction(
    () => {
      const t = document.querySelector('header strong + strong');
      if (!t?.textContent?.includes('Your move')) return false;
      const b = [...document.querySelectorAll('button')].find((x) => /end turn/i.test(x.textContent ?? ''));
      return !!b && !b.hasAttribute('disabled');
    },
    { timeout: 25_000 },
  ).catch(() => {});
  await page.waitForTimeout(1500);
}

console.log('T1 play+end');
await playFirstHandCard();
await endAndWait();
console.log('T2 play+end');
await playFirstHandCard();
await endAndWait();
// T3 — creatures from T1 should be sickness-free
console.log('T3 play (optional) + not ending');
await playFirstHandCard();

await page.waitForTimeout(800);

// Find a creature WITHOUT summoning sickness on our field
const creatureHandle = await page.evaluateHandle(() => {
  const field = document.querySelector('section[aria-label^="Your battlefield"]');
  if (!field) return null;
  const buttons = Array.from(field.querySelectorAll('button[aria-label*="mana cost"]'));
  // Prefer one that does NOT include "Summoning sickness" in its aria-label
  const healthy = buttons.find(
    (b) => !/summoning sickness/i.test(b.getAttribute('aria-label') ?? ''),
  );
  return healthy ?? buttons[0] ?? null;
});

const hasCreature = await creatureHandle.evaluate((el) => !!el);
if (!hasCreature) {
  console.log('no creature available for combat shot');
  await browser.close();
  process.exit(0);
}

const el = creatureHandle.asElement();
await el.scrollIntoViewIfNeeded();
await el.click();
await page.waitForTimeout(800);

console.log('shot — combat (attacker selected)');
await page.screenshot({ path: resolve(OUT, 'combat.png'), fullPage: false });

await browser.close();
console.log(`done → ${OUT}`);
