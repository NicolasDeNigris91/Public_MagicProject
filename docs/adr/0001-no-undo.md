# ADR 0001: No undo, no rewind, no history stack

- Status: Accepted
- Date: 2026-04-22

## Context

This is a turn-based card game with imperfect information. The player
makes mana, attack-target, and play-order decisions every turn. A
common QA reflex is to ask for an "undo last action" affordance.

## Decision

We do not ship undo, rewind, or any history-replay UI. Decisions are
permanent within a match. The `gameLog` is append-only, capped at 200
entries, and exists for announcement and inspection — it cannot be used
to reconstruct prior state, and no code path attempts to.

## Why

1. **Decision permanence is the whole point.** A card game where you
   can roll back is a puzzle, not a game. The tension of "did I tap
   that creature too soon?" is the design.
2. **Mistakes are educational.** The combat log + live regions explain
   what just happened so the next decision is better-informed. Undo
   would short-circuit that loop.
3. **Engine simplicity.** The engine is `(state, args) → state`. Adding
   reversibility means keeping every `state` reachable in memory, or
   making every transition emit an inverse operation. Both are large
   surface areas for bugs.
4. **Accessibility is *not* an excuse for undo.** The fix for "I
   couldn't tell my creature was sick" is a louder badge and a clearer
   announcement, not a do-over button.

## Consequences

- Any future PR that adds a `lastState`, `previousState`, `undo()`,
  history stack, or "rewind to turn N" UI must supersede this ADR
  with a new one explaining why permanence no longer holds.
- The store does not need devtools-driven time-travel exposed to end
  users. (Devtools-for-developers in dev builds is fine — that's
  inspection, not undo.)
- Test coverage for "what happens if you undo" is zero by construction.
