# ADR 0004: No explicit turn phases

- Status: Accepted
- Date: 2026-05-05

## Context

Magic: The Gathering's full rules model a turn as a chain of phases —
beginning, main, combat, end — each with their own legality rules.
`IGameState` once carried a `phase: 'draw' | 'main' | 'combat' | 'end'`
field anticipating this structure, but no engine action ever read it,
no transition wrote it (other than initializing to `'main'`), and no
UI surface gated behavior on it. The field was dead state.

## Decision

We drop the `Phase` union and the `IGameState.phase` field. The engine
remains a single implicit "main" phase: a player's turn starts, they
draw, they may play creatures, they may attack, they end the turn.
Combat sits inside the same conceptual phase as casting.

## Why

1. **YAGNI.** Carrying a typed field nobody reads invites
   misinterpretation — a future contributor sees `phase: 'combat'` in
   a possibility space and starts gating logic on it, except the field
   is never set there.
2. **Engine simplicity.** The current rule set has no phase-only
   restrictions. "Cannot attack with summoning-sick creatures" is a
   property of the creature, not the turn structure. "Cannot attack
   face while opponent has blockers" is a property of the board.
3. **Faithfulness.** This project does not aim to reproduce MTG's full
   phase chain. It is a portfolio piece focused on accessibility and
   combat-animation polish. Promising a structure we do not implement
   is a worse signal than naming what we do.

## Consequences

- Any future PR that needs phase-gated behavior (e.g. instants only at
  certain steps, untap/upkeep separation) must supersede this ADR with
  a new one explaining the rule the gate enforces and the test coverage
  that validates it.
- The combat-log entries that today emit kind `'turn'` and `'combat'`
  are unaffected — those tag the _event_, not a phase, and remain
  useful even without an explicit phase field.
