# ADR 0003: Scryfall as the card data source

- Status: Accepted
- Date: 2026-04-22

## Context

The engine is a generic creature-combat system. Cards are data. We
need a real, image-rich, queryable corpus of cards or the demo feels
like a prototype.

## Decision

[Scryfall](https://scryfall.com)'s public REST API. Fetched
client-side via Axios from the browser, behind a thin
`scryfall.client.ts`. Adapted to our `ICard` shape in
`scryfall.adapter.ts`. An offline 10-card fallback deck ships in
`fallback-deck.ts` for the case where Scryfall is unreachable.

## Why Scryfall

- **No auth.** Demoable from a fresh clone with zero env setup.
- **High-quality card images and oracle text** in a stable schema.
- **Permissive use** for fan projects under the WotC fan content
  policy + Scryfall's data ToS, with attribution.

## Why not MTGJSON, custom dataset, or LLM-generated cards

- MTGJSON is bulk-download-shaped — a lot of plumbing for a small
  client app, and image hosting is not theirs.
- A custom dataset means hand-curating ~40 cards every time we want
  to refresh; the demo's "real cards" punch is lost.
- LLM-generated cards muddy the "is this game's behavior real?"
  question we're trying to answer with the demo.

## Constraints we accept

- **English-only oracle text from Scryfall.** Our UI translates the
  *chrome* (buttons, headings, announcements) but the card text
  itself stays English. Translating Magic rules text is a project
  unto itself; out of scope. The choice is documented at the top of
  `src/i18n/messages.ts`.
- **Network dependency on first load.** The fallback deck mitigates
  this for live demos, but the headline experience needs reach to
  `api.scryfall.com`.
- **Schema drift risk.** Mitigation lives in
  `scryfall.adapter.ts` (defensive `?? defaults` everywhere). A
  follow-up will add Zod validation at this boundary so a Scryfall
  field rename surfaces as a logged-and-dropped card, not a runtime
  crash.

## Consequences

- The adapter is the only file allowed to know about Scryfall types.
  Anything else importing `ScryfallCard` is a layering violation.
- Switching to Lorcana, Pokemon TCG, or a homebrew JSON should mean
  rewriting `adapters/` + `services/` only. The engine and UI come
  along unchanged.
