# MTG TCG - Accessible Combat Demo

A keyboard-first, screen-reader-first TCG demo built on the [Scryfall API](https://scryfall.com). Real *Magic: The Gathering* cards plug into a stripped-down combat engine, and the whole UI is wired so the same information reaches you whether you're reading the card frame or hearing it through ARIA live regions. Built as a portfolio piece because most "accessible" web games stop at tab order.

![Tabuleiro com uma criatura selecionada como atacante](docs/screenshots/combat.png)

> **Fan content notice.** Not affiliated with Wizards of the Coast. Built under the [WotC Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Card data courtesy of Scryfall.

---

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
- **Mana ramps each turn.** `manaMax` goes up by 1 at the start of every turn and `manaAvailable` refills to it. Unspent mana doesn't carry over. You can play as many creatures as you can afford.
- **Summoning sickness.** A creature that entered this turn cannot attack. It gets one full round before it can swing. Shown visually (desaturated + badge) and in the card's `aria-label`.
- **Combat is direct-pick.** Select one of your creatures, then click/Enter a target: an opponent creature (fight) or the opponent directly (face damage). Damage is simultaneous.
- **Face damage only when the board is clear.** While the opponent has any creature on the battlefield, direct attacks are blocked. The "Attack opponent directly" button is disabled and announced as such for screen readers.
- **Two loss conditions**: life reaches zero, or you try to draw from an empty deck.
- **Color selection.** Before each match you pick one of the five MTG colors; the opponent plays a different color, chosen at random from the remaining four. Both decks are assembled from the same 10-slot skeleton (curve + stat budget), so it's color-vs-color rather than lucky-draw-vs-unlucky-draw.

## Architecture

```
src/
├── engine/          # Pure rules + AI. No React, no fetch.
│   ├── types.ts
│   ├── rules.ts     # drawCard, playCardToField, resolveCombat, applyDamage, beginTurn, canAfford, canAttack
│   └── ai.ts        # pickCardToPlay, planAttacks
├── adapters/        # ScryfallCard -> ICard (only file that knows about Scryfall)
├── services/        # Axios client + offline fallback deck
├── store/           # Zustand - delegates to engine, owns the game log
├── hooks/           # useAnnouncer (live regions), useDeck, useInspector,
│                   # useAttackerSelection, useInertWhile, usePostPlayFocus
├── components/      # Card (focusable + animated), Hand, Battlefield, LiveRegion, ...
└── app/             # Next.js App Router entry
```

`engine/` doesn't import from anywhere else in the tree, so swapping Scryfall for Lorcana, Pokemon TCG or a homebrew JSON only means rewriting `adapters/`.

## Accessibility

The card's prose description is treated as data, not presentation. The adapter precomputes `accessibilityDescription` on every `ICard` (a natural sentence with name, type, mana cost, power/toughness and rules text), and that string is the single source of truth for every screen-reader-facing surface.

What that gives you:

- **Focusable cards** - each card is a native `<button>`. Tab navigates, Enter/Space activates.
- **Keyboard-only combat** - ArrowLeft/Right between cards in hand; select an attacker, then a blocker (or the "Attack directly" button). Skip link at the top of the page.
- **Two live regions** - a `polite` one for info (draws, phase changes) and an `assertive` one for urgent events (damage, defeats). Identical repeated messages force a re-announce via a changing React `key`.
- **Decorative images** - `<img alt="">` because the semantic content is already in `aria-label`. No double-read.
- **Graceful image failure** - `onError` flips to a text fallback (`CardFallback`) with gradient + stats; the announced description doesn't change.
- **`prefers-reduced-motion`** - Framer Motion's `useReducedMotion` is honored; animations collapse to snaps.

Verified against:

- NVDA + Firefox, VoiceOver + Safari (keyboard-only playthrough)
- axe DevTools (no critical violations)
- Lighthouse Accessibility >= 95

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
2. In Railway, **New Project -> Deploy from GitHub repo**, pick this repo.
3. Railway reads [`railway.json`](./railway.json) and runs `npm ci && npm run build` then `npm run start`. Node version is pinned via [`.nvmrc`](./.nvmrc) and `engines.node` in `package.json`.
4. No env vars required. Scryfall is an unauthenticated public API. Railway injects `PORT` automatically; `next start` honors it.
5. Generate a public domain in **Settings -> Networking** once the first deploy is green.

Security headers (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, etc.) are emitted by Next.js itself via [`next.config.mjs`](./next.config.mjs), so they apply on any host.

If Scryfall is unreachable at runtime, the UI announces the switch and plays with a built-in 10-card offline deck so the demo still works.

## Disclaimer

Este é um projeto de portfólio não oficial, sem fins lucrativos. *Magic: The Gathering*, nomes de cartas, arte e marcas registradas são propriedade da **Wizards of the Coast LLC**, subsidiária da Hasbro, Inc. Este projeto não é produzido, endossado, apoiado ou afiliado à Wizards of the Coast. Dados e imagens das cartas são fornecidos pela API pública [Scryfall](https://scryfall.com). Este conteúdo de fã é permitido sob a [Política de Conteúdo de Fãs da Wizards of the Coast](https://company.wizards.com/en/legal/fancontentpolicy).
