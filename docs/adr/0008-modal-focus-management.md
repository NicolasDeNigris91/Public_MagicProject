# ADR 0008: in-flow alertdialog with sibling-inert focus trap

- Status: Accepted
- Date: 2026-05-06

## Context

Three modal-shaped surfaces exist today: `CardInspector` (full
overlay), `KeyboardHelp` (full overlay), and the game-over panel
(in-flow). Two of the three are portal-rendered backdrops with a
fully separate focus context; the third was an inline panel with
`tabIndex=-1`, no focus trap, and no inerting of the rest of the
page.

A keyboard-only user reaching the game-over state could Tab past
the dialog into still-visible-but-non-interactive controls
(Battlefield card buttons, ControlBar buttons). The game logic
correctly rejects those activations once `winner` is set, but the
dead Tab stops are a real a11y defect: they break the user's
expectation that focus stays within "the thing that's asking for a
decision."

Two patterns were on the table:

1. **Promote game-over to a portal-rendered overlay** like
   `CardInspector`. Visually larger change — the panel currently sits
   between the header and the play zones, scoping the outcome to the
   board it followed.
2. **Trap focus in the inline panel and inert the play area.**
   Smaller visual delta, requires solving the "how do you inert
   siblings of an inline dialog" problem.

## Decision

Choose option 2. Extract `src/components/GameOverDialog/` from the
inline JSX with:

- `role="dialog" aria-modal="true" aria-labelledby="game-over-title"`
- Auto-focus on the primary action (`Play again`) on mount, not the
  wrapping container
- A Tab/Shift+Tab trap that cycles between the two action buttons
  and reclaims focus to the primary if focus has drifted outside the
  dialog (devtools, async overlays)
- Explicit absence of an Escape handler: the game state is final by
  ADR 0001 (no-undo), so dismissing the dialog without choosing a
  follow-up would leave the user in an unrecoverable state

The page wraps the play zones in `<div ref={playAreaRef}
className={styles.playArea}>` with `display: contents`, then runs
`useInertWhile(playAreaRef, !!winner)`. The wrapper is structural
only — `display: contents` keeps the existing flex layout intact.
The header (log/lang toggles, the new help "?" button) is NOT
inerted: those affordances stay functional after the game ends so
the user can review the log or switch language while reading the
outcome.

## Why not portal it out

The inline placement IS the affordance: the dialog sits directly
below the header where the player has been reading turn state,
above the closing snapshot of the board. A portal'd overlay would
hide the board behind a backdrop, which:

- breaks the "see what just happened" closure moment
- requires solving the centered-modal layout for a piece of UI that
  doesn't otherwise need it
- inflates the bundle with backdrop machinery the page doesn't need

The portal'd overlays (`CardInspector`, `KeyboardHelp`) earn their
backdrop because they really are interrupting modals over the live
game state — the user wanted to look at one card or one help table.
Game-over is closer to a status/end banner with actions attached.

## Why no Escape handler

ADR 0001 established that game state is final by design. The two
buttons cover the only valid follow-up actions (replay same color,
pick a new color). An Escape that dismissed the dialog without a
follow-up would either:

- leave the page inerted and unreachable, or
- silently un-inert and leave the user staring at a dead board with
  no game in progress

Both are worse than the current "you must pick one" contract.

## Verification

- 5 unit tests in `GameOverDialog.test.tsx`: dialog semantics, auto-
  focus, Tab cycle, Shift+Tab cycle, focus reclaim from outside,
  click-handler dispatch.
- The `inert` attribute is observable in the rendered DOM; an axe
  sweep on the in-game surface (`src/__a11y__/a11y.test.tsx`)
  catches role/label regressions.
- Real screen-reader testing (NVDA / VoiceOver / TalkBack) is on the
  pending QA list and is user-blocked from this agent.

## Consequences

- Future modals that share the "in-flow alertdialog" shape MUST
  follow this pattern: extract a component, role=dialog + aria-modal,
  auto-focus primary, Tab trap, parent wraps siblings in a
  `display: contents` div + `useInertWhile`.
- `useInertWhile` is now used by two surfaces (CardInspector via
  the page mainRef, GameOverDialog via the playAreaRef). Adding a
  third ref is cheap; growing past four would justify a small
  hook or context that owns inert state for the page.
- Tests for any new in-flow dialog should follow the 5-case shape
  in `GameOverDialog.test.tsx` (semantics + auto-focus + Tab cycle
  - Shift+Tab + outside-focus reclaim).
