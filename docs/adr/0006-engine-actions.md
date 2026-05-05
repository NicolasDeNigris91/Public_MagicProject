# ADR 0006: engine/actions.ts as the source of truth for action semantics

- Status: Accepted
- Date: 2026-05-05
- Supersedes: parts of the implicit "store owns orchestration" pattern in 0002

## Context

The Zustand store at `src/store/useGameStore.ts` was originally the
single home for everything action-shaped: it validated input, called
the pure rule helpers in `src/engine/rules.ts`, mutated state via
`set()`, and emitted live-region announcements via the embedded
`announce()` action. The action bodies grew over time — `attack`
peaked at ~100 lines, `endTurn` at ~25, `drawCard` at ~35.

Two pressures pushed for separation:

1. **Testability.** Snapshot-style tests for whole-action equivalence
   (`src/store/useGameStore.equivalence.test.ts`) want a single
   pre/post observation. With orchestration spread across multiple
   `set()` calls and `get().announce()` side effects, reasoning about
   "what does this action produce" required reading the entire
   imperative body.

2. **Refactor safety.** Future work — e.g. an undo system if the no-undo
   ADR is ever revisited, or a server-side replay — would benefit
   from being able to drive the engine without instantiating a Zustand
   store at all.

## Decision

Introduce `src/engine/actions.ts` exporting four pure functions:

- `executePlayCardToField(state, who, cardId): ActionResult`
- `executeDrawCard(state, who): ActionResult`
- `executeEndTurn(state): ActionResult`
- `executeAttack(state, attackerId, blockerId): ActionResult`

`ActionResult` is `{ next: IGameState, logs: ActionLogSeed[] }`.
`logs` are seeds (message + priority + kind + meta), not full
`LogEntry` records — minting ids and timestamps stays a store
concern via the per-store Clock + IdGen.

The store reduces to thin glue:

```ts
attack: (id, blocker) => applyResult(set, get, log, executeAttack(get(), id, blocker));
```

`applyResult` mints log seeds via `log()`, merges them into
`gameLog`, and writes the new state slices in a single `set()` call.
Trim-on-overflow (`MAX_LOG`) stays in the store because it is a
storage concern, not an action one.

## Verification

The 9 equivalence snapshots in
`src/store/useGameStore.equivalence.test.ts` were written and
committed BEFORE the extraction. Every snapshot passes byte-identical
against the post-extraction code. Announcer copy, log id ordering,
state slice layout, and winner detection are all preserved exactly.

## Why announcer copy is part of the contract

Strings like `"Turn 2. Your turn."`, `"You drew P5. Hand size 5."`,
and the combat compose templates live in the engine because they are
the _truth_ of what a screen reader reads. Snapshot tests pin them.
Anyone changing copy in `engine/actions.ts` lands the new strings
and the regenerated snapshots in the same commit; reviewers see the
diff alongside the rationale.

If/when the project gains real i18n for in-game narration (today only
the UI chrome is i18n'd via `messages.ts`), the engine can return
`{ template, vars }` instead of pre-formatted strings, and the store's
glue becomes responsible for resolving them. Until then, English is
the canonical announcer language and these strings are the source.

## Consequences

- New game-rule action work goes in `engine/actions.ts`, not the
  store. The store is for reactive state distribution and log id /
  timestamp minting.
- `applyResult` is the single state-write seam. Anything that needs
  to bypass it — initGame today, plus any future "snapshot-restore"
  feature — must consciously document why.
- Pure-function tests for actions can now be written without
  instantiating Zustand at all: `executeAttack(stateFixture, id,
blocker)` returns the next state and logs synchronously. The
  existing snapshot tests still drive through the store because they
  also exercise the glue, but new logic-level tests can stay pure.
- The thin-glue pattern means the store is now ~60% smaller in body
  size, and every imperative path it removed was doing one of:
  validation, calling the engine, calling `announce`. None of those
  were store concerns — they were misplaced.
