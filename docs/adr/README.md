# Architecture Decision Records

Each file is one decision: the context that forced the choice, the
choice itself, and the trade-off accepted. Read them in order if
you want the full story; consult them by topic when you're about
to revisit a constraint.

| #    | Title                                                                                     | Status   |
| ---- | ----------------------------------------------------------------------------------------- | -------- |
| 0001 | [No undo, no rewind, no history stack](./0001-no-undo.md)                                 | Accepted |
| 0002 | [Zustand over Redux for store](./0002-zustand-over-redux.md)                              | Accepted |
| 0003 | [Scryfall as the source of card data](./0003-scryfall-source.md)                          | Accepted |
| 0004 | [No explicit phases (untap/upkeep/draw/...)](./0004-no-explicit-phases.md)                | Accepted |
| 0005 | [Strict CSP enforced (style-src self, no unsafe-inline)](./0005-csp-enforce.md)           | Accepted |
| 0006 | [engine/actions.ts as the source of truth for action semantics](./0006-engine-actions.md) | Accepted |
| 0007 | [Forced-colors / HCM fallback strategy is per-module](./0007-forced-colors-fallbacks.md)  | Accepted |
| 0008 | [In-flow alertdialog with sibling-inert focus trap](./0008-modal-focus-management.md)     | Accepted |
| 0009 | [Enforce i18n catalog parity via the type system](./0009-i18n-parity-via-types.md)        | Accepted |
| 0010 | [Scheduled mutation testing twice weekly, never per-PR](./0010-mutation-cadence.md)       | Accepted |
| 0011 | [Planned migration from Next 14 to Next 16](./0011-next-14-to-16-migration.md)            | Proposed |

## Conventions

- Numbered sequentially, never renumbered. A superseded ADR keeps its
  number and gains a `Supersedes:` / `Superseded by:` cross-link.
- Status is one of `Proposed` / `Accepted` / `Superseded`. `Rejected`
  ADRs stay in the repo for the same reason a rejected RFC stays in
  the IETF tracker — the rationale matters even when the answer is
  "no".
- Each ADR ends with a `Consequences` section spelling out the
  follow-up obligations the decision creates.
