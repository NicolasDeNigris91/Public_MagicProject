# ADR 0007: forced-colors fallback strategy is per-module, not global

- Status: Accepted
- Date: 2026-05-06
- Relates to: 0005 (CSP enforcement)

## Context

Windows High Contrast Mode (HCM), `prefers-contrast: more`, and similar
OS-level color overrides flatten every author-supplied color in CSS to
a small palette of system colors (Highlight, Mark, ButtonText,
CanvasText, LinkText, ButtonFace). The browser does the right thing
for body text and ordinary backgrounds, but anywhere we encode meaning
in color — focus rings, win/loss outcome, damage flash, sick/exhausted
badges — that meaning vanishes silently.

A pre-pass audit found 14 `.module.css` files with hardcoded hex
colors carrying semantic load. Six surfaces actually convey meaning
exclusively through color in the absence of an OS-applied fallback:

1. `:focus-visible` rings (every interactive element)
2. `Card[aria-pressed="true"]` selected state
3. `gameOver` win border (green) vs `gameOverDefeat` loss border (red)
4. `lifePulse` damage flash on `PlayerHeader`
5. `damageNumber` floating combat readout on `CombatLayer`
6. `sickBadge` / inspect button on `Card`

The other 8 files use color decoratively — gradients, panel chrome,
disabled states — and the OS-applied fallback handles them correctly
without intervention.

## Decision

Per-module `@media (forced-colors: active)` blocks override only the
selectors that carry semantic load, mapped to the system palette
directly:

| Affordance           | System color                                |
| -------------------- | ------------------------------------------- |
| Focus ring (global)  | `outline-color: Highlight`                  |
| Selected card        | `border-color + outline: Highlight`         |
| Victory panel border | `border-color: Highlight`                   |
| Defeat panel border  | `border-color: Mark`                        |
| Life pulse / damage  | `color: Mark`                               |
| Mana accent          | `color: LinkText`                           |
| System buttons       | `background: ButtonFace; color: ButtonText` |

`forced-color-adjust: none` is reserved for two surfaces where the
badge IS the affordance and we explicitly want a framed, colored
artifact rather than a flattened one: the `sickBadge` and the
floating `damageNumber`. Both are paired with a 1px border in the
same system color so they remain visible against any background.

A new `e2e/forced-colors.spec.ts` exercises the in-game surface with
`page.emulateMedia({ forcedColors: 'active' })` plus an axe sweep,
chromium-only because Playwright's emulation flag isn't honored by
firefox/webkit yet.

## Why per-module instead of a global override sheet

Two reasons argue against a single `forced-colors.css`:

1. **Locality of evidence.** A reviewer changing
   `Card.module.css` should see the HCM override in the same file,
   in the same diff. A central sheet rots silently when components
   move; per-module blocks surface as a visible "you also need to
   update the HCM rule" cue.
2. **Specificity hygiene.** The CSS Modules compiler scopes class
   names to the module they ship with, so per-module overrides
   never need higher-specificity hacks to win. A central sheet would
   either need `!important` or carefully ordered `@layer` declarations.

## Verification

- `e2e/forced-colors.spec.ts` runs the smoke + axe flow under HCM
  emulation. A regression that drops `:focus-visible` outline color
  would surface as an axe violation under the contrast rule.
- Six unit/snapshot test files exercise the components that carry
  the overrides (`Card.test.tsx`, `PlayerHeader.test.tsx`, etc.);
  the CSS itself isn't unit-testable but the rendered DOM is.
- Manual QA on a Windows machine with High Contrast: black theme is
  on the user's pending QA list and is user-blocked from this
  agent's perspective.

## Consequences

- New components MUST add a `@media (forced-colors: active)` block
  if they carry color-coded semantics. The audit list above is the
  reviewer's checklist.
- `forced-color-adjust: none` requires explicit justification in a
  comment; defaulting to `none` would defeat the OS palette and is
  not a valid escape hatch.
- The strategy doesn't extend to `prefers-contrast: more` separately —
  in practice, users who set High Contrast also set HCM, and the
  overlap covers the realistic accessibility surface. If a divergent
  theme emerges, this ADR will need a follow-up.
