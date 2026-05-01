<!-- Keep the description tight - reviewer should be able to predict the diff. -->

## What

<!-- One paragraph: what this PR changes and why. -->

## Area

- [ ] engine (`src/engine/` - pure rules / AI)
- [ ] adapter / services (Scryfall, offline fallback)
- [ ] hooks / store
- [ ] components / UI
- [ ] accessibility (focus, live regions, ARIA)
- [ ] tooling / CI / docs

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (if engine / AI / describe utils touched)
- [ ] Keyboard-only playthrough works (if interaction surface touched)
- [ ] Screen reader announcements still match game state (if a11y surface touched)
- [ ] Lighthouse accessibility >= 95 (if UI touched)

## Related

Closes #
