# Security Policy

## Supported Versions

Only the `main` branch receives security fixes.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| other   | :x:                |

## Reporting a Vulnerability

**Please do not report vulnerabilities via public GitHub issues.**

Email **nicolas.denigris91@icloud.com** with the subject line
`[SECURITY] MagicProject: <short description>`.

Include:

- A description of the vulnerability and its impact.
- Reproduction steps (URL, payload, or minimal case).
- Affected commit SHA or tag.
- Your assessment of severity, if any.

## Response Timeline

- **Acknowledgement:** within 72 hours.
- **Initial assessment:** within 7 days.
- **Fix or mitigation:** target 30 days for confirmed vulnerabilities.

Researchers acting in good faith are credited (with permission) in the
release notes once a fix ships.

## Known Open Advisories

`npm audit` currently reports advisories against `next@14.x` and its
transitive `postcss` dependency. They are tracked here rather than
silently carried:

| Advisory                                                     | Affects                       | Status                                                                                                        |
| ------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GHSA-9g9p-9gw9-jx7f — Image Optimizer DoS via remotePatterns | self-hosted `next start`      | N/A — this is a portfolio site without remotePatterns; deployed builds use Vercel-managed image optimization. |
| GHSA-h25m-26qc-wcjf — RSC HTTP request deserialization DoS   | apps using insecure RSC paths | N/A — project doesn't expose user-driven RSC actions.                                                         |
| GHSA-ggv3-7p47-pfv8 — HTTP request smuggling in rewrites     | self-hosted with rewrites     | N/A — `next.config.js` doesn't define rewrites.                                                               |
| GHSA-3x4c-7xq6-9pq8 — `next/image` disk cache growth         | self-hosted `next start`      | N/A — Vercel manages image cache.                                                                             |
| GHSA-q4gf-8mx6-v5v3 — DoS with Server Components             | self-hosted with RSC          | Mitigated by no user-driven RSC handlers.                                                                     |
| GHSA-qx2v-qp2m-jg93 — PostCSS `</style>` XSS via Stringify   | build-time tooling only       | N/A — postcss runs at build, never on user input at runtime.                                                  |

The full fix path is `next@16`, which is a breaking major (App Router
runtime changes, `cookies()` async API, others). Pinning to `next@14`
is intentional until a tracked migration lands. Re-run `npm audit`
during dependency reviews; if a non-breaking fix becomes available,
ship it on its own branch.
