# Contributing

This is a portfolio piece focused on accessibility. Contributions that move it
forward:

- **Accessibility fixes.** Screen reader regressions, focus loss, keyboard
  traps, missing live-region announcements, color-contrast issues, broken
  forced-colors / reduced-data behaviour.
- **Engine bugs.** Anything where the rules implementation diverges from the
  documented combat subset (see README "Gameplay rules").
- **AI improvements.** Better turn planning that still matches the simple
  combat scope.
- **Performance / animation.** As long as `prefers-reduced-motion` keeps
  working and the bundle budgets in
  [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) hold.

If you are reporting a security issue, do **not** open a public PR or issue;
follow [SECURITY.md](./SECURITY.md).

## Scope

The README is explicit about what this project is and is not. PRs that try to
implement instants, abilities, the stack, or other full-MTG mechanics will
likely be closed. The point is the accessibility model on top of a small,
testable rules subset.

Permanent design constraints (no undo, CSP enforcement, focus management,
i18n parity, mutation cadence, the planned next@16 migration) are documented
in [`docs/adr/`](./docs/adr/). Read the relevant ADR before proposing a
change that contradicts one — the trade-off is usually called out and PRs
rediscover-it-by-accident don't tend to land.

## Local environment

```bash
npm install
npm run dev               # http://localhost:3000

# Same gates CI runs, in order:
npm run typecheck         # strict tsc, zero errors
npm run lint              # eslint flat config
npm run test              # vitest: unit + property + a11y sweep
npm run test:coverage     # ratchets per-folder thresholds
npm run build
npm run size:check        # per-route gzip + brotli budgets

npm run ci                # all of the above

# E2E (Playwright + browser-axe, 5 projects)
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e

# Mutation testing (Stryker, multi-minute)
npm run test:mutation
```

The pre-commit hook runs `lint-staged` (ESLint --fix + Prettier) on changed
files. The pre-push hook runs `typecheck` + `test`. Don't bypass them with
`--no-verify`; if a hook fails, fix the underlying issue.

## Test bar

| Change touches               | Required                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/`                | New unit tests + check `npm run test:mutation` keeps the floor at ≥ 92%                                                                                                    |
| `src/store/`                 | `npm test` passes; equivalence snapshots regenerated in the same commit                                                                                                    |
| Components / hooks (a11y)    | Keyboard-only walkthrough + axe sweep clean; consider e2e if focus-related                                                                                                 |
| CSS modules (semantic color) | Add a `@media (forced-colors: active)` block if the change carries semantic meaning ([ADR 0007](./docs/adr/0007-forced-colors-fallbacks.md))                               |
| Animation                    | `prefers-reduced-motion` collapses; consider `prefers-reduced-data` for image fetches                                                                                      |
| Bundle-size impact           | If `size:check` fails, justify the bump in the commit message + same-commit edit to `scripts/check-bundle-size.mjs` ([rules](./docs/PERFORMANCE.md#when-to-bump-a-budget)) |
| Adds an i18n key             | All four catalogs (`pt`/`en`/`es`/`fr`) updated in the same commit; TypeScript will fail the build otherwise                                                               |

CI runs typecheck, lint, build, unit tests, e2e (5 Playwright projects),
visual regression (when Linux baselines exist), CodeQL, OpenSSF Scorecard,
and the bundle-size gate on every PR. Lighthouse is informational. Stryker
runs on a twice-weekly cron, not per-PR.

## Style

- TypeScript: strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
  No `any`. Engine code is pure — no React, no fetch, no `Date.now`,
  no `Math.random` unless injected.
- Cards are `<button>` elements; `aria-label` comes from the precomputed
  `accessibilityDescription`. Do not duplicate text into image alt.
- Two live regions: `polite` for info, `assertive` for damage / defeat.
  Force re-announce of identical messages with a changing React `key`.
- New modal-shaped surfaces: follow the pattern in
  [ADR 0008](./docs/adr/0008-modal-focus-management.md) — `role="dialog"
aria-modal="true"`, `useFocusTrap` on the dialog ref, sibling-inert
  via `useInertWhile`. Three reference implementations: `CardInspector`,
  `KeyboardHelp`, `GameOverDialog`.
- Commits: [conventional commits](https://www.conventionalcommits.org/)
  (`type(scope): summary`), lower-case, imperative mood. Allowed types:
  `feat`, `fix`, `perf`, `a11y`, `refactor`, `revert`, `style`, `test`,
  `build`, `ci`, `docs`, `chore`. Match the existing log style. No
  AI-attribution trailers.

## Adding an ADR

1. Pick the next number (`docs/adr/0012-...`). Numbers are never reused.
2. Use the heading + section shape of the existing ADRs: `Status`, `Date`,
   `Context`, `Decision`, `Verification`, `Consequences`. Add `Supersedes:`
   or `Relates to:` links if applicable.
3. Add an entry to [`docs/adr/README.md`](./docs/adr/README.md).
4. If the ADR carries a follow-up obligation (e.g. "future modals MUST
   use this pattern"), spell it in `Consequences`. Reviewers will hold
   PRs to it.

## Release process

Releases are managed by
[release-please](https://github.com/googleapis/release-please). On every
push to `main`, a workflow opens (or updates) a release PR that bumps
`package.json` and generates `CHANGELOG.md` from the conventional commits
landed since the last release.

- `feat:` → minor bump
- `fix:` / `perf:` / `a11y:` / `refactor:` → patch bump
- `BREAKING CHANGE:` in the commit body → major bump
- `test:` / `build:` / `ci:` / `docs:` / `chore:` → hidden from changelog
  but tracked in commit history

Merging the release PR tags the repo and publishes a GitHub release. The
project does not publish to npm; the action manages the git tag + release
notes only.

## License

By submitting a PR, you agree that your contribution is licensed under the
[MIT License](./LICENSE) of this project. Card data and trademarks remain
property of Wizards of the Coast and Scryfall as documented in the LICENSE.
