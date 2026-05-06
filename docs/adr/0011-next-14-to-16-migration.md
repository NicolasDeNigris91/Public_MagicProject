# ADR 0011: planned migration from Next 14 to Next 16

- Status: Proposed
- Date: 2026-05-06
- Supersedes: the placeholder note in SECURITY.md "Pinning to next@14
  is intentional until a tracked migration lands"
- Closes: 6 advisories on next@14.x (GHSA-9g9p-9gw9-jx7f,
  GHSA-h25m-26qc-wcjf, GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8,
  GHSA-q4gf-8mx6-v5v3, GHSA-qx2v-qp2m-jg93)

## Context

`npm audit` reports 11 advisories rooted in `next@14.x` and its
transitive `postcss`. Each one is N/A for our deployment (the
SECURITY.md table walks through why), but "N/A under our config" is
not "patched" — a future config change could expose us, and the
visible vuln count erodes the project's signal.

The fix path is `next@16` (or `15.4+` for some, but `16` is the
floor that closes all six). That's a breaking major covering two
upgrade hops — 14 → 15 first, then 15 → 16 — with React 19 as a
co-required upgrade somewhere in the path.

## Known breaking changes that affect THIS codebase

| Change                                              | Impact site                                                          | Severity                  |
| --------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| `headers()` / `cookies()` / `draftMode()` are async | `src/app/layout.tsx:37` reads `x-nonce`                              | High                      |
| Default `fetch` caching changes (15)                | `src/services/scryfall.client.ts` uses axios, not fetch — unaffected | Low                       |
| GET route handlers no longer cached by default (15) | No route handlers in this app                                        | None                      |
| React 19 paired upgrade                             | All `'use client'` files; framer-motion peer dep                     | Medium                    |
| `next/image` API tweaks                             | `src/components/ColorSelection.tsx`                                  | Low                       |
| `inert` becomes a first-class React 19 prop         | `src/hooks/useInertWhile.ts`                                         | Low (cleanup opportunity) |
| Middleware runtime adjustments                      | `src/middleware.ts` (CSP nonce + headers)                            | Medium                    |

The framer-motion peer dep on React 19 is the most likely upgrade
blocker: 11.x requires React 18; framer needs to be on 12+ for
React 19. Bundle impact of that swap is non-trivial.

## Plan

### Phase 1 — branch + types-only pass

1. Branch `chore/next-16` from `main`.
2. `npm install next@16 react@19 react-dom@19 eslint-config-next@16
@types/react@19 @types/react-dom@19 framer-motion@12`.
3. `npm run typecheck` and triage the failure list. Expected: layout
   nonce read, framer types, possibly inspector portal types.
4. Make the layout `headers()` site `async` and `await` the read.
   `RootLayout` becomes `async function RootLayout`.
5. Verify ESLint flat config still loads under `eslint-config-next@16`.

Acceptance: typecheck + lint clean. No runtime testing yet.

### Phase 2 — runtime smoke

1. `npm run build` and inspect for net-new warnings or chunk-size
   regressions. Re-baseline `scripts/check-bundle-size.mjs` on the
   branch only — do NOT merge a budget bump until the full suite is
   green.
2. `npm run dev` and walk the smoke flow (color pick → game state →
   inspect → log toggle → game over → play again). Watch the
   browser console for hydration mismatches and the React 19
   warning surface.
3. Run `npm test -- --run` (vitest). Watch for changes in
   `@testing-library/react`'s React 19 rendering — `act()` calls
   may need rewrap.
4. `npm run test:e2e` against the dev branch.

Acceptance: green typecheck + lint + vitest + e2e.

### Phase 3 — visual + a11y

1. `npm run test:visual` — visual baselines will likely regenerate
   because React 19's hydration ordering can shift class injection
   timing. Commit refreshed baselines on the branch.
2. Re-run forced-colors + axe sweep against React 19's updated
   ARIA tree.
3. Run `npm run test:mutation` to confirm the score didn't drop
   below break=90 from any test-runner shifts.

Acceptance: visual baselines refreshed in branch, axe + mutation
unchanged.

### Phase 4 — perf + bundle reconcile

1. Compare the analyze report against pre-migration size. The
   common shape:
   - React 19 ships smaller (~3 kB gzip win)
   - Framer Motion 12 ships slightly larger
   - Net: usually wash or small win
2. Re-run Lighthouse (CI runner is the source of truth). The
   tightened thresholds in `lighthouserc.json` (perf 0.95 etc.)
   should hold.
3. Update `scripts/check-bundle-size.mjs` budgets in the same
   commit as the merge. Deltas explained in the commit message.

Acceptance: Lighthouse holds 0.95+ on perf; bundle budgets bumped
or held with rationale.

### Phase 5 — merge

1. Resolve any conflicts against current `main` (especially in
   `package-lock.json` — the path-of-pain).
2. Run the full pre-push hook (typecheck + tests).
3. Merge as a single commit (squash) with message linking back to
   this ADR and the SECURITY.md advisory rows it closes.
4. Delete the SECURITY.md "Known Open Advisories" section — or
   reduce it to whatever's left if `npm audit` still surfaces
   anything.

## Open questions

- **Framer Motion 12 budget impact**: needs measurement on the
  branch. If it grows the bundle past comfortable, the simultaneous
  swap to a CSS-only animation strategy (already considered in the
  perf round) becomes part of the migration.
- **`useInertWhile` cleanup**: React 19 supports `inert` as a
  first-class prop. The hook can shrink to a JSX prop spread; saves
  ~10 LOC and one ref. Optional, do in a follow-up PR not the
  migration itself.
- **Middleware CSP nonce flow**: Next 16 may have changed how
  request-scoped headers propagate. Validate by inspecting the
  `<Script id="csp-nonce-anchor">` rendered nonce against the
  `x-nonce` header value in the network tab.

## Why a single ADR over a tracking issue

ADRs live in the repo and survive the GitHub project reorgs that
issues don't. The migration is a multi-week, multi-phase change
that future-me (or a contributor) will want to read in context with
the ADRs that established the constraints (CSP, focus management,
i18n, mutation cadence). An issue is right for the work-in-progress;
this ADR is the spec.

The corresponding issue can simply link here and check off phases
as they land.

## Consequences

- The SECURITY.md "Known Open Advisories" section becomes a
  countdown rather than a permanent fixture.
- Any non-trivial work in `src/app/layout.tsx` between now and the
  migration should consider the async-`headers()` shape so the diff
  isn't doubled.
- If a security advisory escalates from "N/A under our config" to
  "actively exploitable" before the migration completes, this ADR
  becomes the entry point for an emergency partial upgrade
  (e.g., hop to 15.4 first if it patches the active vuln).
