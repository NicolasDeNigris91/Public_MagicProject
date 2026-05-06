# MTG TCG - Accessible Combat Demo

[![CI](https://github.com/NicolasDeNigris91/Public_MagicProject/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/NicolasDeNigris91/Public_MagicProject/actions/workflows/ci.yml)
[![CodeQL](https://github.com/NicolasDeNigris91/Public_MagicProject/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/NicolasDeNigris91/Public_MagicProject/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/NicolasDeNigris91/Public_MagicProject/badge)](https://scorecard.dev/viewer/?uri=github.com/NicolasDeNigris91/Public_MagicProject)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A keyboard-first, screen-reader-first TCG demo built on the [Scryfall API](https://scryfall.com). Real _Magic: The Gathering_ cards plug into a stripped-down combat engine, and the whole UI is wired so the same information reaches you whether you're reading the card frame, hearing it through ARIA live regions, or playing under Windows High Contrast Mode. Built as a portfolio piece because most "accessible" web games stop at tab order.

![In-match view: opponent and player headers, both battlefields, the player's hand, and the combat-log toggle](docs/screenshots/hero.png)

> **Fan content notice.** Not affiliated with Wizards of the Coast. Built under the [WotC Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Card data courtesy of Scryfall.

---

## Quality at a glance

| Signal              | Where it sits today                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Unit + property     | 362 tests across 43 files (Vitest + fast-check + JSDOM axe)                                      |
| Branch coverage     | Per-folder thresholds: engine 99/95, store 99/97, services 99/91, hooks 95/86, components 100/91 |
| Mutation score      | 94.5% (engine 96.4, store 91.1) — Stryker `break: 92` enforced via scheduled CI                  |
| End-to-end          | 5 Playwright projects: chromium / firefox / webkit / iPhone 13 / Pixel 5                         |
| Visual regression   | Pinned-input deterministic build, platform-suffixed baselines                                    |
| Lighthouse          | a11y = 1.0 (error gate), perf / best-practices / SEO ≥ 0.95 (warn gate)                          |
| CSP                 | `script-src 'self' 'strict-dynamic' nonce-...`, `style-src 'self'` (no `'unsafe-inline'`)        |
| Bundle ceiling      | `/page` 194.3 kB gzip, `/layout` 104.5 kB gzip — enforced per-build                              |
| Security advisories | 11 residual `next@14` issues, all N/A under our deploy config — see [SECURITY.md](./SECURITY.md) |
| Languages           | pt-BR · en-US · es-ES · fr-FR (parity enforced by the type system)                               |

## Stack

| Concern    | Choice                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router) + TypeScript (strict, `exactOptionalPropertyTypes`)                                     |
| State      | Zustand factory `createGameStore({ clock, idGen, getLang })` for determinism                                    |
| Animation  | Framer Motion + CSS keyframes (with `prefers-reduced-motion` honored)                                           |
| Data       | Scryfall REST via Axios + Zod schemas at the boundary, retry-with-backoff, offline fallback deck                |
| i18n       | Type-enforced flat catalog at `src/i18n/messages.ts` — see [ADR 0009](./docs/adr/0009-i18n-parity-via-types.md) |
| Unit tests | Vitest + Testing Library, fast-check property tests, `vitest-axe` JSDOM sweep                                   |
| E2E tests  | Playwright + `@axe-core/playwright` against the production build, forced-colors smoke                           |
| Mutation   | Stryker, scheduled twice weekly with auto-issue on regression                                                   |
| Quality    | ESLint flat config (typescript-eslint type-checked), Prettier, Husky + commitlint, pre-push typecheck+test      |
| Telemetry  | `@sentry/browser` + `web-vitals`, gated behind `NEXT_PUBLIC_SENTRY_DSN`                                         |

## Gameplay rules

A stripped-down MTG combat subset, just enough to make decisions matter:

- **20 starting life**, 5-card opening hand, decks split 20/20 from a 40-card pool (10/10 on the offline fallback).
- **Mana ramps each turn.** `manaMax` goes up by 1 at the start of every turn and `manaAvailable` refills to it. Unspent mana doesn't carry over. You can play as many creatures as you can afford.
- **Summoning sickness.** A creature that entered this turn cannot attack. It gets one full round before it can swing. Shown visually (desaturated + badge) and in the card's `aria-label`.
- **Combat is direct-pick.** Select one of your creatures, then click/Enter a target: an opponent creature (fight) or the opponent directly (face damage). Damage is simultaneous.
- **Face damage only when the board is clear.** While the opponent has any creature on the battlefield, direct attacks are blocked. The "Attack opponent directly" button is disabled and announced as such for screen readers.
- **Two loss conditions**: life reaches zero, or you try to draw from an empty deck.
- **Color selection.** Before each match you pick one of the five MTG colors; the opponent plays a different color, chosen at random from the remaining four. Both decks are assembled from the same 10-slot skeleton (curve + stat budget), so it's color-vs-color rather than lucky-draw-vs-unlucky-draw.

## Architecture

```
src/
├── engine/          # Pure rules + AI. No React, no fetch, no Date.now.
│   ├── types.ts
│   ├── rules.ts     # drawCard, playCardToField, resolveCombat, applyDamage, beginTurn, canAfford, canAttack
│   ├── actions.ts   # executePlayCardToField / Draw / EndTurn / Attack — pure action layer (ADR 0006)
│   └── ai.ts        # pickCardToPlay, planAttacks
├── adapters/        # ScryfallCard -> ICard (only file that knows about Scryfall)
├── services/        # Axios client + offline fallback deck + prefers-reduced-data short-circuit
├── store/           # Zustand factory — delegates to engine/actions, owns the game log
├── hooks/           # useAnnouncer (live regions), useDeck, useInspector,
│                   # useAttackerSelection, useInertWhile, usePostPlayFocus
├── components/      # Card, Hand, Battlefield, GameOverDialog, KeyboardHelp, LiveRegion, ...
├── i18n/            # Type-enforced 4-language catalog
└── app/             # Next.js App Router entry + middleware (CSP nonce flow)
```

`engine/` doesn't import from anywhere else in the tree, so swapping Scryfall for Lorcana, Pokemon TCG or a homebrew JSON only means rewriting `adapters/`.

For the long-form layered diagram, hard invariants, and design decisions, see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Permanent design choices (no undo, CSP enforcement, focus management, mutation cadence, the planned next@16 migration) are recorded as ADRs under [`docs/adr/`](./docs/adr/). The bundle budgets and Lighthouse SLOs are explained in [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md).

## Accessibility

The card's prose description is treated as data, not presentation. The adapter precomputes `accessibilityDescription` on every `ICard` (a natural sentence with name, type, mana cost, power/toughness and rules text), and that string is the single source of truth for every screen-reader-facing surface.

![Card inspector modal: large card image on the left, structured Type / Mana / P-T metadata on the right, action buttons at the bottom](docs/screenshots/inspector.png)

What that gives you:

- **Focusable cards** — each card is a native `<button>`. Tab navigates, Enter/Space activates, `i` opens the inspector and is exposed via `aria-keyshortcuts`.
- **Listbox-shaped hand** — ArrowLeft/Right move focus, Home/End jump to ends, and `aria-posinset`/`aria-setsize` announce "3 of 5" on the listitem so screen readers convey position.
- **Keyboard-only combat** — select an attacker, then a blocker (or the "Attack directly" button). Skip link at the top of the page.
- **Keyboard help overlay** — press `?` (or click the header `?` button) to enumerate every shortcut. `aria-keyshortcuts` declared on every interactive surface that owns one.
- **Two live regions** — a `polite` one for info (draws, plays, mana) and an `assertive` one for urgent events (damage, defeats). Identical repeated messages force a re-announce via a changing React `key`.
- **`inert` modals + focus traps** — `CardInspector` and `KeyboardHelp` are portal'd overlays with auto-focus + Tab cycle. The game-over panel is an in-flow alertdialog that inerts the play zones via a `display: contents` wrapper — see [ADR 0008](./docs/adr/0008-modal-focus-management.md).
- **Forced-colors / Windows High Contrast** — every focus ring, win/loss border, and damage cue re-emerges via system colors (Highlight, Mark, ButtonText, LinkText) in `@media (forced-colors: active)` blocks. See [ADR 0007](./docs/adr/0007-forced-colors-fallbacks.md). A dedicated Playwright smoke test exercises the in-game surface under HCM emulation plus an axe sweep.
- **`prefers-reduced-data`** — when set, both the deck fetch and the color-picker art fetch short-circuit to local fallbacks. Zero CDN image loads on a metered connection.
- **`prefers-reduced-motion`** — Framer Motion's `useReducedMotion` is honored; the `LifeDisplay` lerp also subscribes to `mql.change` so the flag flips immediately when the OS preference toggles mid-game.
- **Decorative images** — `<img alt="">` because the semantic content is already in `aria-label`. No double-read.
- **Graceful image failure** — `onError` flips to a text fallback (`CardFallback`) with WCAG-AA contrast (≥4.5:1); the announced description doesn't change.

Verified by:

- `vitest-axe` JSDOM sweep + Playwright `@axe-core/playwright` browser sweep — both run on every PR, zero violations on the in-game and color-selection surfaces (WCAG 2.1 AA).
- `forced-colors.spec.ts` — axe sweep under `page.emulateMedia({ forcedColors: 'active' })` (chromium-only).
- Lighthouse Accessibility = 1.0 (CI assertion is `error`-level, not `warn`).

Real screen-reader playthroughs (NVDA / JAWS / VoiceOver / TalkBack) sit on the manual-QA list — automated tooling can't substitute for ear-level confirmation.

## Internationalization

Four languages today: **pt-BR**, **en-US**, **es-ES**, **fr-FR**. The catalog is one `Record<Lang, Record<MessageKey, string>>` map at `src/i18n/messages.ts` — TypeScript fails the build the moment any catalog is missing a key, which is the parity guarantee. Engine-emitted log seeds (`{ template, vars }`) are resolved at log-mint time so the in-game narration switches language live.

The trade-off (no ICU plurals, no runtime locale negotiation, ~6 KB gzip per language inside the layout chunk) is documented in [ADR 0009](./docs/adr/0009-i18n-parity-via-types.md).

## Running locally

```bash
npm install
npm run dev               # http://localhost:3000

# Verification — same gates CI runs, in order
npm run typecheck         # strict tsc, zero errors
npm run lint              # eslint flat config + import order + type-checked rules
npm run format:check      # prettier
npm run test              # vitest: 362 unit + property + a11y sweep
npm run test:coverage     # ratchets per-folder thresholds
npm run build             # next build
npm run size:check        # per-route gzip + brotli budgets
npm run ci                # all of the above, single command

# E2E (Playwright + browser-axe, 5 projects)
npx playwright install --with-deps chromium firefox webkit    # one-time
npm run test:e2e

# Visual regression (deterministic build, platform-suffixed baselines)
npm run test:visual

# Mutation testing (Stryker, multi-minute, scheduled twice weekly in CI)
npm run test:mutation
```

## Deploying

Deploy target: **Railway** (Nixpacks builder).

1. Push to GitHub.
2. In Railway, **New Project -> Deploy from GitHub repo**, pick this repo.
3. Railway reads [`railway.json`](./railway.json) and runs `npm ci && npm run build` then `npm run start`. Node version is pinned via [`.nvmrc`](./.nvmrc) and `engines.node` in `package.json`.
4. Optional: set `NEXT_PUBLIC_SENTRY_DSN` to enable Sentry + Web Vitals reporting. Without it, both modules tree-shake out.
5. Generate a public domain in **Settings -> Networking** once the first deploy is green.

CSP, HSTS, COOP, CORP and other security headers are emitted by Next.js itself via [`next.config.mjs`](./next.config.mjs) and the per-request nonce flows through [`src/middleware.ts`](./src/middleware.ts), so they apply on any host.

If Scryfall is unreachable at runtime — or if `prefers-reduced-data` is set — the UI plays with a built-in 10-card offline deck so the demo still works.

## Disclaimer

Este é um projeto de portfólio não oficial, sem fins lucrativos. _Magic: The Gathering_, nomes de cartas, arte e marcas registradas são propriedade da **Wizards of the Coast LLC**, subsidiária da Hasbro, Inc. Este projeto não é produzido, endossado, apoiado ou afiliado à Wizards of the Coast. Dados e imagens das cartas são fornecidos pela API pública [Scryfall](https://scryfall.com). Este conteúdo de fã é permitido sob a [Política de Conteúdo de Fãs da Wizards of the Coast](https://company.wizards.com/en/legal/fancontentpolicy).
