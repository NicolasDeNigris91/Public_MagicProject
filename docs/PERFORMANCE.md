# Performance budgets and how they're enforced

This is the rationale behind the numbers in
[`scripts/check-bundle-size.mjs`](../scripts/check-bundle-size.mjs)
and [`lighthouserc.json`](../lighthouserc.json). Read this when a CI
gate fails on a budget you didn't expect to trip — or when you're
about to land a feature that bumps a number and want to know which
trade-offs are baked in.

## Bundle ceilings

Each route has a per-build gzip + brotli ceiling, enforced by
`npm run size:check` after every build (also runs in CI's `build`
job). The script walks `.next/app-build-manifest.json`, sums the
chunks each route loads, gzips/brotlis each, and fails if any
exceeds budget.

| Route              | gzip ceiling | brotli ceiling | What's in it                                                             |
| ------------------ | ------------ | -------------- | ------------------------------------------------------------------------ |
| `/page`            | 194.3 kB     | 169.9 kB       | App entry + game UI. Includes Zustand store, engine, Framer Motion, i18n |
| `/layout`          | 104.5 kB     | 92.8 kB        | Root layout. Includes I18nProvider (4 catalogs) + observability shim     |
| `/_not-found/page` | 88.9 kB      | 77.1 kB        | 404. Mostly the framework runtime                                        |

### Why these numbers and not lower

Three things are shipped that aren't strictly necessary for "first
paint of game state":

1. **Framer Motion 11** (~30 kB gzip in the entry chunk). Powers the
   card hover lift, entry flip, and exit fade. Could be replaced with
   CSS keyframes — that swap is on the next-16 migration plan
   ([ADR 0011](./adr/0011-next-14-to-16-migration.md)) but not on
   the critical path today.
2. **Axios 1.16** (~13 kB gzip). Could be `fetch` directly. Saves
   ~3 kB but rewrites scryfall.client.ts and its test mocks.
   Trade-off lands on the perf round if the budget gets tight; it
   isn't today.
3. **The 4-language i18n catalog**. ~6 kB gzip per language inside
   the layout chunk. Could be code-split per locale via dynamic
   imports — but the messages are tiny strings the browser caches
   forever and the URL-routing complexity doesn't pay back at this
   catalog size.

### When to bump a budget

The bump itself goes in the same commit as the feature. Justify in
the commit message, not in the README. The script's comment block
already enumerates past bumps with one-line reasons — that file is
the project's "why is the budget here" archive.

Trip-and-bump is acceptable when:

- The new code passes its own coverage / a11y / mutation gates AND
- The bump is bounded (~1-2 kB gzip) AND
- A reviewer can articulate the user-visible feature in the commit message

Trip-and-bump is NOT acceptable when:

- A casual dependency import inflates the entry chunk by >2 kB
- A feature ships behind a flag that's defaulted off (the bytes
  ship anyway — code-split first)
- The bump is recurring (3 commits in a month each adding 0.5 kB
  — fix the underlying drift, don't keep raising)

## Lighthouse SLOs

Defined in [`lighthouserc.json`](../lighthouserc.json), enforced by
the dedicated `lighthouse.yml` workflow. Per-PR informational; not
a merge gate (CI runner conditions vary).

| Metric                   | Threshold | Severity | Web vital? |
| ------------------------ | --------- | -------- | ---------- |
| Accessibility            | ≥ 1.0     | error    | -          |
| Performance              | ≥ 0.95    | warn     | -          |
| Best Practices           | ≥ 0.95    | warn     | -          |
| SEO                      | ≥ 0.95    | warn     | -          |
| First Contentful Paint   | ≤ 1800 ms | warn     | -          |
| Largest Contentful Paint | ≤ 2500 ms | warn     | LCP (P75)  |
| Cumulative Layout Shift  | ≤ 0.1     | error    | CLS (P75)  |
| Total Blocking Time      | ≤ 200 ms  | warn     | -          |
| Speed Index              | ≤ 3000 ms | warn     | -          |
| Time to Interactive      | ≤ 3500 ms | warn     | -          |
| Max Potential FID        | ≤ 130 ms  | warn     | INP proxy  |

### Why a11y is `error` and the others are `warn`

The a11y score is deterministic (axe rules either pass or fail —
no measurement noise). Locking it at 1.0 with `error` means an a11y
regression actually blocks the workflow.

The performance metrics depend on the CI runner's CPU (LH-CI
documents this) plus network conditions for image fetches. A 0.95
threshold absorbs the realistic flake floor. If a regression is
real, the warning-level signal stays in the run history; if it was
flake, the next run shifts back without a merge being blocked.

CLS escapes the warn / error compromise because it's the one
metric the network can't move on you — a real CLS regression means
a layout shift was introduced in code, period. Hence error-level.

## Web Vitals in production

`@sentry/browser` + `web-vitals` are gated behind the
`NEXT_PUBLIC_SENTRY_DSN` env var. With the DSN set, the layout
mounts an `Observability` boundary that:

- Reports JS errors via Sentry
- Reports CLS / LCP / INP / FCP / TTFB to Sentry as performance
  metrics

Without the DSN, both modules tree-shake out — zero runtime cost.
This means local dev and unkeyed deployments don't ship the
telemetry layer; only environments that have explicitly opted in
do.

The thresholds above match the P75 web-vital bucket for "good" on
the [web.dev metrics
reference](https://web.dev/articles/vitals). If a real-user
regression surfaces in Sentry (LCP P75 > 2500ms, etc.), the
playbook is:

1. Confirm in the Sentry dashboard, not just one alert.
2. Cross-check the latest deploy against the change log for image
   weight, dependency bumps, dynamic-import seams.
3. Re-run Lighthouse against the deploy URL. If Lighthouse agrees,
   the regression is in code; if it doesn't, it's likely network /
   region.

## Mutation testing as a perf-adjacent gate

Stryker doesn't measure runtime perf, but a regression in test
quality is a regression in confidence — which is the bigger long-
term cost. See [ADR 0010](./adr/0010-mutation-cadence.md) for the
twice-weekly cron rationale and the auto-issue path.

## When to update this document

- Bumping a bundle budget: amend the table above and explain WHY in
  one sentence per row.
- Adding a Lighthouse threshold: amend the table; pick `warn` or
  `error` per the rule of thumb above.
- Adding a new perf-adjacent CI gate (e.g. a wasm-payload size
  check, an image-weight inspector): add a section.

Don't update for routine wins. The point of the doc is the
rationale, not the leaderboard.
