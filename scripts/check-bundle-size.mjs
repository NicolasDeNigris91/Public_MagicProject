#!/usr/bin/env node
/**
 * Bundle-size guardrail. Walks the just-built .next/app-build-manifest.json,
 * sums the gzipped + brotli-compressed sizes of the chunks each route
 * loads, and fails if any route exceeds its committed budget.
 *
 * Why: Next.js prints First Load JS in the build summary but doesn't
 * fail on regression. Without an enforced ceiling, a careless dep
 * import quietly inflates the entry bundle one PR at a time. This
 * script is the cheap version of the more elaborate `size-limit` /
 * `bundlewatch` packages — same idea, no extra dependency.
 *
 * Update budgets when an intentional addition is justified; the diff
 * is the one place a reviewer sees the cost of new code.
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const nextDir = resolve(root, '.next');
const manifestPath = resolve(nextDir, 'app-build-manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`[bundle-size] ${manifestPath} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

/**
 * Per-route gzip + brotli budgets in bytes. Numbers are observed
 * post-build size + ~10% headroom so a stray code-path isn't immediately
 * flagged. The intent is "ratchet down or hold", not "guess generously".
 *
 * Update procedure:
 *   1. Run `npm run build && node scripts/check-bundle-size.mjs`.
 *   2. If a real-world feature legitimately bumps a number, raise it
 *      here in the same commit and explain why in the message.
 *   3. Drive-by raises ("CI was green before") are not legitimate.
 */
const BUDGETS = {
  // /page bumped twice on 2026-05-06: a11y deepening + i18n catalogs
  // pushed it to 193 kB gzip; the same-day axios → fetch refactor
  // reclaimed ~21 kB by dropping axios + follow-redirects + form-data
  // + proxy-from-env, taking the route to ~172 kB. Floor sits ~5 kB
  // above current to absorb routine refactors but trip on a real
  // regression. Down-ratchet (175k vs the previous 197k) keeps the
  // budget honest after the win.
  '/page': { gzip: 178_000, brotli: 154_000 },
  // /layout grew ~1.5 kB after the observability shim landed:
  // the static import of src/lib/observability.ts pulls webpack's
  // dynamic-import runtime into the layout chunk even though
  // @sentry/browser and web-vitals themselves stay in lazy chunks
  // until NEXT_PUBLIC_SENTRY_DSN is set. Worth the cost — a single
  // entry point for ErrorBoundary, global error handlers, and
  // Web Vitals reporting beats wiring each call site by hand.
  // Bumped again 2026-05-06 with the es-ES/fr-FR catalogs: I18nProvider
  // pulls in the full messages.ts at the layout level so all 4
  // language tables ship in the layout chunk.
  '/layout': { gzip: 107_000, brotli: 95_000 },
  '/_not-found/page': { gzip: 91_000, brotli: 79_000 },
};

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function sizeOf(file) {
  // Manifest paths are relative to .next; physical chunks live under
  // .next/static. CSS files are reported alongside JS in the manifest.
  const abs = resolve(nextDir, file);
  if (!existsSync(abs)) {
    // Some entries (like CSS in the build manifest) only land on disk
    // when the route actually compiles to something. Missing files
    // contribute 0 to the budget.
    return { raw: 0, gzip: 0, brotli: 0 };
  }
  const buf = readFileSync(abs);
  return {
    raw: statSync(abs).size,
    gzip: gzipSync(buf).length,
    brotli: brotliCompressSync(buf).length,
  };
}

const breaches = [];
const summary = [];

for (const [route, budget] of Object.entries(BUDGETS)) {
  const chunks = manifest.pages?.[route];
  if (!chunks) {
    breaches.push(`Route ${route} not found in build manifest.`);
    continue;
  }
  let raw = 0;
  let gzip = 0;
  let brotli = 0;
  for (const chunk of chunks) {
    const s = sizeOf(chunk);
    raw += s.raw;
    gzip += s.gzip;
    brotli += s.brotli;
  }
  const fmt = (n) => `${(n / 1024).toFixed(1)} kB`;
  const status = gzip > budget.gzip || brotli > budget.brotli ? 'FAIL' : 'ok  ';
  summary.push(
    `[${status}] ${route.padEnd(20)} raw ${fmt(raw).padStart(8)}  gzip ${fmt(gzip).padStart(
      8,
    )} / ${fmt(budget.gzip).padStart(8)}  brotli ${fmt(brotli).padStart(
      8,
    )} / ${fmt(budget.brotli).padStart(8)}`,
  );
  if (gzip > budget.gzip) {
    breaches.push(`${route}: gzip ${fmt(gzip)} exceeds budget ${fmt(budget.gzip)}.`);
  }
  if (brotli > budget.brotli) {
    breaches.push(`${route}: brotli ${fmt(brotli)} exceeds budget ${fmt(budget.brotli)}.`);
  }
}

console.log(summary.join('\n'));

if (breaches.length > 0) {
  console.error('\n[bundle-size] budgets exceeded:');
  for (const b of breaches) console.error(`  - ${b}`);
  console.error(
    '\nIf the increase is intentional, raise the budget in scripts/check-bundle-size.mjs and explain why in the commit message.',
  );
  process.exit(1);
}
