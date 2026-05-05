# ADR 0002: Zustand over Redux / Jotai / Context

- Status: Accepted
- Date: 2026-04-22

## Context

The app needs a single source of match state shared between the page
shell, the hand, the battlefield, the inspector, the combat overlay,
and the live regions. The state is small (one match), ephemeral (no
persistence — see ADR 0001), and updated by a handful of action
families (draw, play, attack, end-turn).

## Decision

Zustand vanilla, no middleware in production. `useGameStore` for game
state and the announcement log. `useCombatStore` for the visual event
queue.

## Why not Redux

- Boilerplate-heavy for a state surface this small. Action types,
  reducers, slices, selectors, dispatches — five files for what
  Zustand expresses in one.
- The team-scaling argument doesn't apply: this is a portfolio
  project with a single maintainer.
- Redux DevTools are still reachable from Zustand via the optional
  `devtools` middleware in development builds.

## Why not Jotai / Recoil / Signals

- Atom-per-value granularity is great for fine-grained reactivity but
  the wrong shape for game state, which transitions atomically. One
  draw mutates `hand`, `library`, and `gameLog` together; expressing
  that across atoms invites stale-pair bugs.

## Why not just Context + useReducer

- Re-render storms: every Context consumer rerenders on every state
  change unless you split contexts manually. Zustand selectors give
  the same per-slice subscription model for free.

## Consequences

- Game-rule logic must live in `src/engine/`, not in the store
  callbacks. The store is the _commit_ layer: it computes the next
  state via engine functions and calls `set`. Anything more is a
  smell that this ADR doesn't license.
- We accept the cost of _not_ having a single canonical action history
  (Redux's main superpower). Tests cover engine functions directly.
- `persist` middleware is intentionally not used: see ADR 0001.
