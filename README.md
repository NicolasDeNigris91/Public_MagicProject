# MTG TCG — Accessible Combat Demo

A keyboard-first, screen-reader-first TCG portfolio demo built on top of the [Scryfall API](https://scryfall.com). Real *Magic: The Gathering* cards power a tiny combat engine, but the whole experience is designed so that a blind player and a sighted player receive **informationally equivalent** experiences — every visual cue (art, layout, flip animation) has a textual counterpart routed through ARIA live regions.

![Tabuleiro com uma criatura selecionada como atacante](docs/screenshots/combat.png)

> **Fan content notice.** Not affiliated with Wizards of the Coast. Built under the [WotC Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Card data courtesy of Scryfall.

---

## Why this project

Three skills shown end-to-end:

1. **Complex state orchestration** — turn structure, combat resolution, an async opponent AI loop, and a live-log all coordinated through a single Zustand store that delegates rule math to a pure engine.
2. **Fluid animation** — Framer Motion handles card flip-in, `layoutId`-based hand → battlefield transitions, and gracefully disables itself under `prefers-reduced-motion`.
3. **Accessibility in a dynamic, visual UI** — the hardest of the three, and the one most portfolios skip. See [Accessibility](#accessibility) below.

## Stack

| Concern         | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Next.js 14 (App Router) + TypeScript (strict)                |
| State           | Zustand (vanilla store, no middleware)                       |
| Animation       | Framer Motion                                                |
| Data            | Scryfall REST API via Axios (with offline fallback deck)     |
| Tests           | Vitest (engine + AI + description utils)                     |

## Gameplay rules

A stripped-down MTG combat subset, just enough to make decisions matter:

- **20 starting life**, 5-card opening hand, decks split 20/20 from a 40-card pool (10/10 on the offline fallback).
- **One creature play per turn.** You pick *which* card to commit — no dumping the hand on turn 1.
- **Summoning sickness.** A creature that entered this turn cannot attack. It gets one full round before it can swing. Shown visually (desaturated + badge) and in the card's `aria-label`.
- **Combat is direct-pick.** Select one of your creatures, then click/Enter a target: an opponent creature (fight) or the opponent directly (face damage). Damage is simultaneous.
- **Two loss conditions**: life reaches zero, or you try to draw from an empty deck (deck-out).
- **Turn counter** visible in the header along with plays remaining.

## Architecture

```
src/
├── engine/          # Pure, framework-agnostic rules + AI. No React, no fetch.
│   ├── types.ts
│   ├── rules.ts     # drawCard, playCardToField, resolveCombat, applyDamage, beginTurn, canPlay, canAttack
│   └── ai.ts        # pickCardToPlay, planAttacks
├── adapters/        # ScryfallCard -> ICard (the ONLY file that knows about Scryfall)
├── services/        # Axios client + offline fallback deck
├── store/           # Zustand — delegates to engine, owns the game log
├── hooks/           # useAnnouncer (live regions), useDeck, useInspector,
│                   # useAttackerSelection, useInertWhile, usePostPlayFocus
├── components/      # Card (focusable + animated), Hand, Battlefield, LiveRegion, …
└── app/             # Next.js App Router entry
```

**Decoupling rule**: `engine/` imports *nothing* outside itself. Swap Scryfall for Lorcana, Pokemon TCG, or a homebrew JSON by rewriting only `adapters/`.

## Accessibility

The core insight: **treat the card's prose description as data, not presentation.** The adapter precomputes `accessibilityDescription` on every `ICard` — a natural sentence containing name, type, mana cost, power/toughness, and rules text. That string is the single source of truth for every screen-reader-facing surface.

What that enables:

- **Focusable cards** — each card is a native `<button>`. Tab navigates, Enter/Space activates.
- **Keyboard-only combat** — ArrowLeft/Right between cards in hand; select an attacker, then a blocker (or the "Attack directly" button). Skip link at the top of the page.
- **Two live regions** — a `polite` one for info (draws, phase changes) and an `assertive` one for urgent events (damage, defeats). Separate regions = correct interruption policy. Identical repeated messages force a re-announce via a changing React `key`.
- **Decorative images** — `<img alt="">` because the semantic content is already in `aria-label`. No double-read.
- **Graceful image failure** — `onError` flips to a text fallback (`CardFallback`) with gradient + stats. A sighted user sees a reasonable card frame; a screen-reader user notices nothing, because their channel is independent of the image.
- **`prefers-reduced-motion`** — Framer Motion's `useReducedMotion` is honored; animations collapse to snaps. No information is conveyed *only* through motion.

Verified against:

- NVDA + Firefox, VoiceOver + Safari (keyboard-only playthrough)
- axe DevTools (no critical violations)
- Lighthouse Accessibility ≥ 95

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + ai + describe utils
npm run typecheck
```

## Deploying

Deploy target: **Railway** (Nixpacks builder).

1. Push to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**, pick this repo.
3. Railway reads [`railway.json`](./railway.json) and runs `npm ci && npm run build` then `npm run start`. Node version is pinned via [`.nvmrc`](./.nvmrc) and `engines.node` in `package.json`.
4. No env vars required. Scryfall is an unauthenticated public API. Railway injects `PORT` automatically — `next start` honors it.
5. Generate a public domain in **Settings → Networking** once the first deploy is green.

Security headers (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, etc.) are emitted by Next.js itself via [`next.config.mjs`](./next.config.mjs), so they apply on any host — Railway, Vercel, or self-hosted.

If Scryfall is unreachable at runtime, the UI announces the switch and plays with a built-in 10-card offline deck so the demo still works.

## Implementation notes worth the PR

- **`engine/rules.ts`** — pure functions, trivially unit-testable without Zustand or React mocks. `beginTurn` is the single source of truth for "start of turn" bookkeeping (clears summoning sickness, refills plays).
- **`utils/describeCard.ts`** — humanizes `{4}{R}{R}` into `"mana cost 4 generic plus red plus red"`. Mana symbols, type lines, and rules text are all routed through here.
- **`hooks/useAnnouncer.ts`** — FIFO queue with 1.1-second hold so every event gets spoken in order; cursor-by-id (not index) so log truncation doesn't skip entries; generation-aware so "Play again" doesn't leave the queue stale.
- **`store/useGameStore.ts`** — owns a monotonic `generation` counter. Async loops (the AI turn cascade) capture the generation at schedule time and bail if it advances, so a rematch started while old `setTimeout`s are still pending can't corrupt the new match.
- **`engine/ai.ts`** — opponent plays its biggest creature (subject to `canPlay`) and attacks only with non-sick creatures, into favorable trades or an empty board. Kept in `engine/` because it's pure logic.
- **Focus restoration** — playing a card from hand unmounts the button; we re-focus the same card on the battlefield via `data-card-id` so keyboard users don't drop to `<body>`.

## Disclaimer

Este é um projeto de portfólio não oficial, sem fins lucrativos. *Magic: The Gathering*, nomes de cartas, arte e marcas registradas são propriedade da **Wizards of the Coast LLC**, subsidiária da Hasbro, Inc. Este projeto não é produzido, endossado, apoiado ou afiliado à Wizards of the Coast. Dados e imagens das cartas são fornecidos pela API pública [Scryfall](https://scryfall.com). Este conteúdo de fã é permitido sob a [Política de Conteúdo de Fãs da Wizards of the Coast](https://company.wizards.com/en/legal/fancontentpolicy).
