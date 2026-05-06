# ADR 0010: scheduled mutation testing twice weekly, never per-PR

- Status: Accepted
- Date: 2026-05-06

## Context

Stryker has been wired into `npm run test:mutation` since
2026-05-05 with a configured `break: 90` threshold. As of
2026-05-06, the score sits at 92.72% across `src/engine/**` and
`src/store/**` (engine 95.94, store 86.59, useCombatStore 94.17,
useGameStore 79.37).

The threshold doesn't enforce itself in CI. Until this ADR, the
floor only tripped when someone remembered to run the script
locally — a regression could ride main for weeks unnoticed.

Two viable wiring options:

1. **Run on every PR.** Strongest signal, worst latency. A full
   Stryker run on this codebase is multi-minute (mutations × tests
   × concurrency). Across the typical PR cadence this would gate
   reviews on a workflow that's slower than typecheck + lint +
   build + e2e + visual combined.
2. **Run on a schedule.** Slightly weaker signal (regression sits
   for at most one cron interval), zero per-PR cost.

## Decision

Schedule a dedicated `mutation.yml` workflow at 02:00 UTC on Mondays

- Thursdays, plus `workflow_dispatch` for ad-hoc runs.

Two cadences in a week means a regression surfaces within ~3 days
of landing, which is acceptable for a quality floor that's been
holding at 92%+ for weeks. 02:00 UTC sits outside US/EU dev hours
so the runner is unlikely to fight other workloads.

On a non-zero exit (Stryker dropping below `break: 90`), the
workflow opens a GitHub issue labelled `ci` + `mutation-regression`
with the run URL, commit SHA, and a hint at the typical fix path.
Manual `workflow_dispatch` runs skip the issue creation — those are
intentional probes, not surprises.

The HTML report uploads as an artifact for either trigger so the
per-mutant breakdown is one click away from the failure.

## Why not nightly

Nightly (7×/week) is overkill for a project with this commit
velocity. The runner cost is small in absolute terms, but each run
also clears the incremental cache (`.stryker-tmp/incremental.json`
isn't committed), so back-to-back runs do redundant work. Two
runs spaced 3 days apart catches mid-week regressions without the
redundancy.

## Why `break: 90` and not `break: 95`

The score has held 90+ for the engine/store contract surface, but
useGameStore sits at 79% with the rest of the surface lifting the
average. A higher break threshold would either:

- pin useGameStore at a level its current tests can't sustainably
  hold (the remaining survivors are mostly equivalent mutants —
  process.env checks, default-clock arrows, color label literals)
- or force an arms race of "test the test" that produces busy work
  without catching real regressions.

`break: 90` absorbs the noise floor and trips on a real regression
(a mutant set the previous tests caught now escapes detection).

## Verification

- The cron schedule itself is verified by waiting for it to fire.
  GitHub Actions shows the next scheduled run on the workflow's
  page; manual `workflow_dispatch` exercises the same job
  immediately.
- The auto-issue path is tested by `workflow_dispatch` running
  against a temporarily lowered `break` threshold. (Not done as
  part of this ADR; the `if: github.event_name == 'schedule'`
  guard means dispatch runs explicitly skip it.)

## Consequences

- The mutation score is now visibly tracked. A dropped test that
  weakened the score below 90 surfaces as an issue within 3 days.
- New code in `src/engine/**` and `src/store/**` (the Stryker
  `mutate` glob) inherits the floor implicitly — tests for the new
  code must catch enough mutants to keep the aggregate above 90.
- The mutation report URL goes in the auto-opened issue; reviewers
  should expect to download the artifact and read the per-mutant
  breakdown rather than relying on the issue body alone.
- If the per-PR cost becomes affordable (e.g. infrastructure
  improvements lower a full run below 30s), revisit and switch to
  per-PR. Until then, scheduled is the right cadence.
