// Regenerate README/portfolio screenshots.
//   npm i -D playwright && npx playwright install chromium
//   npm run dev       # in another terminal, note the port
//   MAGIC_URL=http://localhost:3002 node scripts/screenshots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT_DIR = resolve(
  'C:/Users/Nicolas De Nigris/Desktop/MyPersonalWebSite/public/projects/magic',
);
const URL = process.env.MAGIC_URL ?? 'http://localhost:3002';

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const page = await ctx.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') console.log('[page error]', m.text());
});

console.log(`navigating → ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });

await page.waitForSelector('h1:has-text("MTG")', { timeout: 30_000 });
await page
  .waitForFunction(() => !document.body.innerText.includes('Loading deck from Scryfall'), {
    timeout: 45_000,
  })
  .catch(() => console.log('deck still loading - proceeding anyway'));

await page.waitForTimeout(1500);

const playerHand = () =>
  page.locator('section[aria-label^="Your hand"] button[aria-label*="mana cost"]');
const playerField = () =>
  page.locator('[aria-label="Your battlefield"] button[aria-label*="mana cost"]');
const opponentField = () =>
  page.locator('[aria-label="Opponent battlefield"] button[aria-label*="mana cost"]');

async function playCardFromHand() {
  const cards = playerHand();
  const n = await cards.count();
  if (!n) {
    console.log('  no hand cards');
    return false;
  }
  await cards.first().scrollIntoViewIfNeeded();
  await cards.first().click();
  const dialog = page.getByRole('dialog');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    console.log('  dialog did not open');
    return false;
  }
  const playBtn = dialog.getByRole('button', { name: /play to field/i });
  if (!(await playBtn.count())) {
    console.log('  no play button in dialog');
    await page.keyboard.press('Escape');
    return false;
  }
  await playBtn.click();
  await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  console.log('  played card');
  return true;
}

async function endTurn() {
  const btn = page.getByRole('button', { name: /^end turn$/i });
  await btn.waitFor({ state: 'visible' });
  await btn.click({ force: true });
  // wait until it's the player's turn again AND combat animations have settled
  await page.waitForFunction(
    () => {
      const turnEl = document.querySelector('header strong + strong');
      if (!turnEl?.textContent?.includes('Your move')) return false;
      const endBtn = [...document.querySelectorAll('button')].find((b) =>
        /end turn/i.test(b.textContent ?? ''),
      );
      return !!endBtn && !endBtn.hasAttribute('disabled');
    },
    { timeout: 20_000 },
  ).catch(() => {});
  await page.waitForTimeout(1500);
}

console.log('step - play card T1');
await playCardFromHand();
console.log('step - end T1, wait AI');
await endTurn();
console.log('step - play card T2');
await playCardFromHand();
console.log('step - end T2, wait AI');
await endTurn();

await page.waitForTimeout(800);

console.log('shot - hero (full page)');
await page.screenshot({ path: resolve(OUT_DIR, 'hero.png'), fullPage: true });

console.log('shot - board');
await page.screenshot({ path: resolve(OUT_DIR, 'board.png'), fullPage: false });

// Inspector shot - click a hand card to open modal
{
  const firstHandCard = playerHand().first();
  if (await firstHandCard.count()) {
    await firstHandCard.scrollIntoViewIfNeeded();
    await firstHandCard.click();
    const dialog = page.getByRole('dialog');
    try {
      await dialog.waitFor({ state: 'visible', timeout: 3000 });
      await page.waitForTimeout(500);
      console.log('shot - inspector');
      await page.screenshot({ path: resolve(OUT_DIR, 'inspector.png'), fullPage: false });
    } catch {
      console.log('  inspector dialog did not open');
    }
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

// Combat shot - click a player creature on battlefield; this selects it as attacker
{
  const myCreature = playerField().first();
  if (await myCreature.count()) {
    await myCreature.scrollIntoViewIfNeeded();
    await myCreature.click();
    await page.waitForTimeout(700);
    console.log('shot - attacker selected');
    await page.screenshot({ path: resolve(OUT_DIR, 'combat.png'), fullPage: false });
  } else {
    console.log('  no player creatures on field for combat shot');
  }
}

// Hand close-up
{
  const hand = page.locator('section[aria-label^="Your hand"]');
  if (await hand.count()) {
    await hand.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    console.log('shot - hand');
    await hand.first().screenshot({ path: resolve(OUT_DIR, 'hand.png') });
  }
}

await browser.close();
console.log(`done → ${OUT_DIR}`);
