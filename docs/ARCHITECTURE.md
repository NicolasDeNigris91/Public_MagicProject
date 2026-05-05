# Architecture

This document is the source-of-truth for the project's layered design and the
invariants that hold across releases. Read this first if you are about to
touch the engine, the store, or anything that ships text to a screen reader.

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  src/app, src/components                          (UI / RSC+CC)  │
│  Renders state. Reads from Zustand. Dispatches user intents.     │
│  No game-rule decisions live here.                               │
├──────────────────────────────────────────────────────────────────┤
│  src/hooks                                       (orchestration) │
│  useAnnouncer, useDeck, useInspector, useAttackerSelection,      │
│  useAIOrchestrator, usePostPlayFocus, useInertWhile.             │
│  Glue between UI events and store actions.                       │
├──────────────────────────────────────────────────────────────────┤
│  src/store                                          (state)      │
│  useGameStore, useCombatStore. Holds match state and the         │
│  visual-event queue. Delegates to engine/ for transitions.       │
├──────────────────────────────────────────────────────────────────┤
│  src/engine                                       (pure rules)   │
│  types, rules (draw/play/combat/turn/mana), ai, color.           │
│  No React, no fetch, no Date.now, no Math.random unless          │
│  injected. Deterministic given (state, action_sequence).         │
├──────────────────────────────────────────────────────────────────┤
│  src/adapters, src/services            (data ingress / boundary) │
│  scryfall.adapter, scryfall.client, fallback-deck. The only      │
│  files that know what "Scryfall" is. Swapping data sources       │
│  means rewriting these and nothing else.                         │
└──────────────────────────────────────────────────────────────────┘
```

## Hard invariants

These are properties the codebase commits to keeping true. Any PR that
violates one needs an ADR explaining the trade-off.

1. **`src/engine/` imports nothing from React, Zustand, the store, hooks,
   or components.** Verifiable with a single grep. The engine is a
   reusable pure library; the rest of the app is one consumer.

2. **No undo, no rewind, no history stack.** Decisions are permanent
   within a match. See [ADR 0001](./adr/0001-no-undo.md). The append-only
   `gameLog` is for announcement and inspection only — it cannot
   reconstruct prior state and is intentionally capped.

3. **The accessibility description is data, not presentation.** The
   adapter precomputes `accessibilityDescription` on every `ICard`. UI
   surfaces (card buttons, inspector dialogs, live regions) read from
   that single field. Translating, restyling, or adding visual badges
   never desyncs from what a screen reader hears.

4. **Two live regions, two priorities.** `polite` for routine events
   (draws, phase changes, mana spent). `assertive` for urgent events
   (damage, defeats, errors the player must hear). Repeated identical
   messages force a re-announce by changing the React `key`. The
   announcer queue holds each message for ~1100 ms to avoid trampling.

5. **Reduced-motion is honored everywhere.** Framer Motion components
   read `useReducedMotion()`. CSS keyframes are wrapped in
   `@media (prefers-reduced-motion: reduce)` collapses. The
   `useCombatStore` queue keeps semantics (events still drain) but skips
   the animation timing.

## Data flow on a typical action

Player presses Enter on a card in hand:

```
Card button onKeyDown
  → useAttackerSelection / page.tsx handler   (intent translation)
  → useGameStore.playCard(cardId)             (store action)
  → engine/rules.ts:playCardToField           (pure transition)
  → set({ ... })                              (store commit)
  → useAnnouncer push("polite", "...")        (live region)
  → useCombatStore.queueEntry (only when relevant)
```

Every step on the right of the arrow is testable without rendering React.

## Why this shape

- **Engine pure** so we can property-test it (planned: `fast-check`),
  replay-test it, and swap data sources without touching rules.
- **Store thin** because game state changing is what the engine does;
  the store is the seam between pure transitions and React's render
  loop. Rule logic that lives in the store is a smell — see
  [ADR 0002](./adr/0002-zustand-over-redux.md).
- **Adapter at the edge** so Scryfall (or its replacement) never leaks
  internal field names into our types. See
  [ADR 0003](./adr/0003-scryfall-source.md).

## What this document is not

- A tutorial. Read the source — it's small.
- A roadmap. Open issues track that.
- A list of every file. The tree in `README.md` covers that.
