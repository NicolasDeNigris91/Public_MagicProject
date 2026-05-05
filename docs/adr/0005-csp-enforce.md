# ADR 0005: CSP enforce with strict script-src, pragmatic style-src

- Status: Accepted
- Date: 2026-05-05

## Context

The project shipped with `Content-Security-Policy-Report-Only` so we
could observe violations without breaking the app. The intention was
always to flip to enforce once the codebase no longer relied on
inline scripts or styles. Reaching enforce required two pieces:

1. Eliminating runtime `<style>` injection and migrating ~87 inline
   `style={...}` attributes across 14 components to CSS modules.
2. Issuing a per-request nonce for `script-src` so Next.js's own boot
   scripts execute under strict CSP.

A blocker surfaced during migration: the combat overlay positions
damage numbers and flight clones via inline `style="left: ..."`,
where the coordinates come from `getBoundingClientRect()` at runtime.
These cannot be hoisted into a stylesheet.

## Decision

Flip CSP to enforce mode with the following directives:

- `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'` — every
  request gets a fresh base64 nonce from `src/middleware.ts`. Next.js
  reads the nonce from the `x-nonce` request header (set by
  middleware) and applies it to its boot scripts. `'strict-dynamic'`
  lets nonced scripts load further child scripts (chunk loader)
  without each chunk needing its own nonce.
- `style-src 'self' 'unsafe-inline'` — kept as the documented
  holdout for combat-overlay dynamic positioning.
- All other directives (`img-src`, `connect-src`, `frame-ancestors`,
  `base-uri`, `form-action`, `object-src`, `upgrade-insecure-requests`)
  unchanged.

The header is now `Content-Security-Policy` (enforced) instead of
`Content-Security-Policy-Report-Only`.

## Why script-src is strict but style-src is not

The XSS threat model is dominated by JavaScript injection. Allowing
arbitrary inline scripts is the classic XSS vector — an attacker who
can inject `<script>` runs full credentials-bearing JS in the user's
session. Requiring a nonce on every script blocks that path
completely; an injected `<script>` without the right nonce is
ignored.

Allowing inline styles, by contrast, narrows but does not close the
attack surface. CSS injection can leak data through attribute
selectors (`input[value^="a"] { background: url(/log?c=a); }`), can
disrupt UX with z-index/clip games, and can target other origins'
embeds via mix-blend-mode trickery. None of these reach script
execution. For a single-origin app with no sensitive form fields
beyond color picks, the residual risk is acceptable.

CSP3 provides `'strict-dynamic'` for `script-src` but no analogous
mechanism for `style-src`. The available alternatives are:

1. `'unsafe-hashes' 'sha256-...'` for every distinct inline style
   string — combinatorially impossible for runtime coordinates.
2. Server-injected `<style nonce>` blocks per dynamic value —
   architecturally heavy for a 600ms damage-number animation.
3. CSS `attr()` as length value — not yet broadly supported.

Dropping the combat overlay would regress the visible combat-animation
feature shipped in the prior batch. Locking style-src behind the same
guarantee as script-src would cost more than it earns.

## Consequences

- The page becomes dynamic-rendered (`headers()` is read in
  `src/app/layout.tsx`), losing static prerender. Acceptable: the app
  is a `'use client'` SPA whose initial HTML carries little value
  beyond the skeleton.
- Any new component that needs runtime-computed inline style must
  scope it as narrowly as possible and document why a stylesheet rule
  cannot replace it. The default is "use a CSS module"; inline style
  is the documented exception.
- A future PR may revisit style-src strictness if browser support for
  `attr()` expressions covers the remaining cases or if the overlay
  is rewritten to use Web Animations API targets without inline
  positioning.
- The nonce is regenerated per request; cached HTML responses must
  not bypass middleware. `Cache-Control: private, no-cache, no-store`
  is set automatically by the dynamic-rendering opt-in.
