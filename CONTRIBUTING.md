# Contributing

This is a portfolio piece focused on accessibility. Contributions that move it
forward:

- **Accessibility fixes.** Screen reader regressions, focus loss, keyboard
  traps, missing live-region announcements, color-contrast issues.
- **Engine bugs.** Anything where the rules implementation diverges from the
  documented combat subset (see README "Gameplay rules").
- **AI improvements.** Better turn planning that still matches the simple
  combat scope.
- **Performance / animation.** As long as `prefers-reduced-motion` keeps
  working.

If you are reporting a security issue, do **not** open a public PR or issue;
follow [SECURITY.md](./SECURITY.md).

## Scope

The README is explicit about what this project is and is not. PRs that try to
implement instants, abilities, the stack, or other full-MTG mechanics will
likely be closed. The point is the accessibility model on top of a small,
testable rules subset.

## Local environment

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # engine + AI + describe utils
npm run typecheck
```

## Test bar

| Change touches            | Required                                        |
| ------------------------- | ----------------------------------------------- |
| `src/engine/`             | New unit tests covering the rule change         |
| `src/store/`              | `npm test` passes                               |
| Components / hooks (a11y) | Keyboard-only playthrough + screen reader sweep |
| Animation                 | `prefers-reduced-motion` still collapses motion |

CI runs `typecheck` and `test` on every PR.

## Style

- TypeScript: strict. No `any`. Engine code is pure - no React, no fetch.
- Cards are `<button>` elements; `aria-label` comes from the precomputed
  `accessibilityDescription`. Do not duplicate text into image alt.
- Two live regions: `polite` for info, `assertive` for damage / defeat.
  Force re-announce of identical messages with a changing React `key`.
- Commits: conventional commits (`type(scope): summary`), lower-case,
  imperative mood. Match the existing log style. No AI-attribution
  trailers.

## License

By submitting a PR, you agree that your contribution is licensed under the
[MIT License](./LICENSE) of this project. Card data and trademarks remain
property of Wizards of the Coast and Scryfall as documented in the LICENSE.
