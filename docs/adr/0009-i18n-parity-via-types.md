# ADR 0009: enforce i18n catalog parity via the type system

- Status: Accepted
- Date: 2026-05-06

## Context

The translation catalog at `src/i18n/messages.ts` ships ~95 keys
across 4 languages today (pt-BR, en-US, es-ES, fr-FR). Every prior
add-a-key change touched two language blocks; the es/fr addition
on 2026-05-06 quadrupled that surface.

Two incidents pushed the question of "how do we guarantee parity":

1. During the engine→template refactor (ADR 0006), `messages.ts`
   gained ~20 keys for engine-emitted log seeds. Without a parity
   guard, it would have been trivial to add a key to `pt` and ship
   `messages.en['log.combat.face.byPlayer']` returning `undefined`,
   producing the literal string `undefined` on screen for English
   users.
2. Adding a new language is otherwise a bookkeeping nightmare: the
   reviewer must cross-check ~95 keys × N languages by eye against
   the union, and a missing key only surfaces when a user happens
   to trigger the affected message.

## Decision

Encode parity in the type system, not in tests:

```ts
export type MessageKey = 'app.title' | 'turn.label' | … (~95 entries);

export const messages: Record<Lang, Record<MessageKey, string>> = {
  pt: { /* every MessageKey present, value: string */ },
  en: { /* every MessageKey present */ },
  es: { /* every MessageKey present */ },
  fr: { /* every MessageKey present */ },
};
```

`Record<Lang, Record<MessageKey, string>>` is the load-bearing piece.
TypeScript fails the build the moment any catalog is missing any
key. Adding a new key to the union without adding it to all four
catalogs is a hard error, surfaced before commit by the pre-commit
hook (lint-staged → eslint --fix runs the type-checked rule set).

`format(template, vars)` is a tiny `{var}`-replacement helper. Vars
are typed as `Record<string, string | number>` and missing vars are
left in place as `{var}` so a broken substitution is visible, not
silently empty.

## Why not next-intl / react-intl / i18next

The runtime catalog this app needs is small (~95 keys, ~6 KB gzip
total per language) and the messages don't use ICU MessageFormat
features (plurals beyond singular/plural toggles, currency, dates,
relative times). The libraries solve real problems at industrial
scale; pulling in any of them would add 15–40 kB gzip plus
configuration surface for zero practical lift.

If/when this app gains a real plural rule (Russian's nominative-
paucal-genitive trio is the canonical "the simple format breaks"
test) or runtime locale negotiation across 10+ languages, the
calculus flips and a real ICU library is justified. Until then, the
type-enforced flat catalog wins on bundle, complexity, and
reviewer load.

## Why not a runtime parity test

A test like "every Lang has every MessageKey" would catch the same
class of bug, but at test time, not commit time. The type system
catches it at the editor / `tsc --noEmit` step, which is faster
feedback and works in IDEs without running the test runner.

The runtime test is also strictly weaker: it validates the same
property the type encodes, with worse latency.

## Verification

- `npm run typecheck` fails on a missing key in any catalog.
- `LangToggle.test.tsx` asserts the toggle renders one button per
  language (`expect(screen.getAllByRole('button')).toHaveLength(4)`),
  catching a regression that drops a language from `LANGS` without
  also dropping it from the catalog.
- `I18nProvider`'s `LANGS.includes()` validation rejects a stale
  localStorage value from before a language was removed (pt → en,
  not pt → some-future-lang-we-pulled).

## Consequences

- Adding a new language is ~190 LOC of plain string entries plus 1
  line in the `Lang` type and 1 in the `LANGS` array. No provider
  edit, no test edit beyond the toggle button count, no library to
  configure. The es-ES + fr-FR addition on 2026-05-06 followed this
  shape exactly.
- Removing a language requires updating the `Lang` type, `LANGS`,
  the catalog block, and the toggle test count — same shape as
  adding, in reverse.
- Adding a new MessageKey forces a translation pass for every
  language in the same commit. This is intentional: shipping a key
  with a placeholder English value in 4 catalogs is more honest than
  shipping a key with `undefined` in 3 of them.
- The pattern doesn't scale to user-content i18n (Scryfall card
  names, oracle text). Those stay in their source language by
  ADR 0003.
