# ADR 0005: CSP enforce with strict script-src and strict style-src

- Status: Accepted
- Date: 2026-05-05
- Updated: 2026-05-06 (style-src tightened to `'self'` only)

## Context

The project shipped with `Content-Security-Policy-Report-Only` so we
could observe violations without breaking the app. The intention was
always to flip to enforce once the codebase no longer relied on
inline scripts or styles. Reaching enforce required two pieces:

1. Eliminating runtime `<style>` injection and migrating ~87 inline
   `style={...}` attributes across 14 components to CSS modules.
2. Issuing a per-request nonce for `script-src` so Next.js's own boot
   scripts execute under strict CSP.

A holdout surfaced during migration: the combat overlay positioned
damage numbers and flight clones via inline `style="left: ..."`,
where the coordinates come from `getBoundingClientRect()` at runtime.
The 2026-05-05 cut accepted this as `style-src 'self' 'unsafe-inline'`.

The 2026-05-06 follow-up rewrote the overlay to set CSS custom
properties (`--combat-x`, `--combat-y`, `--tx`, `--ty`, etc.) via
`element.style.setProperty()` on a ref instead of via React's `style`
prop. CSS-OM mutations are not subject to `style-src` (CSP3 only
gates parsed inline styles — `<style>` blocks and `style=""`
attributes), so the overlay no longer depends on `'unsafe-inline'`
and the directive can be tightened to `'self'`.

## Decision

CSP is enforced with the following directives:

- `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'` — every
  request gets a fresh base64 nonce from `src/middleware.ts`. Next.js
  reads the nonce from the `x-nonce` request header (set by
  middleware) and applies it to its boot scripts. `'strict-dynamic'`
  lets nonced scripts load further child scripts (chunk loader)
  without each chunk needing its own nonce.
- `style-src 'self'` — authored CSS modules and global stylesheets
  only. No inline styles, no inline `<style>` blocks. Runtime
  positioning lives in CSS custom properties set via setProperty().
- All other directives (`img-src`, `connect-src`, `frame-ancestors`,
  `base-uri`, `form-action`, `object-src`, `upgrade-insecure-requests`)
  unchanged.

The header is `Content-Security-Policy` (enforced).

## Why both script-src and style-src can now be strict

The XSS threat model is dominated by JavaScript injection. Requiring
a nonce on every script blocks that path completely; an injected
`<script>` without the right nonce is ignored.

CSS injection narrows but does not close the attack surface — it can
leak data through attribute selectors
(`input[value^="a"] { background: url(/log?c=a); }`), disrupt UX
with z-index/clip games, and target other origins' embeds via
mix-blend-mode trickery. None of these reach script execution, but
they're still worth blocking when the cost is low.

For runtime-computed positioning, the available alternatives at the
2026-05-05 review were:

1. `'unsafe-hashes' 'sha256-...'` for every distinct inline style
   string — combinatorially impossible.
2. Server-injected `<style nonce>` blocks per dynamic value —
   architecturally heavy.
3. CSS `attr()` as length value — not broadly supported.
4. **Setter-driven CSS custom properties — chosen on 2026-05-06.**

`element.style.setProperty('--combat-x', '128px')` is a CSS-OM
mutation, distinct from a `style=""` attribute. The browser does
not subject CSS-OM writes to `style-src` parsing (the directive
applies to authored inline styles at parse time). The combat overlay
keeps the same runtime positioning behavior, but the rendered DOM
contains no `style=""` attributes — only `class=""` references to
CSS-module rules that read the custom properties.

## Consequences

- The page is still dynamic-rendered (`headers()` is read in
  `src/app/layout.tsx`), losing static prerender. Acceptable: the
  app is a `'use client'` SPA whose initial HTML carries little
  value beyond the skeleton.
- New components that need runtime-computed positioning should set
  CSS custom properties via `setProperty()` rather than React's
  `style` prop. CSS-module classes consume the variables.
- Authored inline `style={...}` is now a CI failure waiting to
  happen — under `style-src 'self'` the browser silently drops the
  attribute and the layout breaks. Lint or visual regression tests
  catch the regression; pattern is `setProperty + module class`.
- The nonce is regenerated per request; cached HTML responses must
  not bypass middleware. `Cache-Control: private, no-cache, no-store`
  is set automatically by the dynamic-rendering opt-in.
