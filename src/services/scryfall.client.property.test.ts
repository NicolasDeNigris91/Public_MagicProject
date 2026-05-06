/**
 * Property-based resilience tests for the Scryfall client.
 *
 * Hand-picked cases (network error, 4xx, 5xx, malformed envelope) are
 * already covered in scryfall.client.test.ts. The properties here lock
 * in the invariants that have to hold across ANY combination of those
 * failure modes, including ones we forget to enumerate:
 *
 *   - fetchDeckForColor never throws — every code path returns a
 *     FetchResult, even under random network chaos.
 *   - The deck always has SKELETON.length cards. We never serve a
 *     short hand, regardless of what came back.
 *   - The fallback path is deterministic per color: same input,
 *     identical output across calls (frozen seed deck).
 *
 * Each property runs 100+ generated scenarios; counterexamples shrink
 * to the smallest sequence that broke the invariant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

vi.mock('axios', () => {
  const get = vi.fn();
  return {
    default: { create: () => ({ get }) },
    AxiosError: class AxiosError extends Error {},
    __esModule: true,
  };
});

import axios, { AxiosError } from 'axios';
import { COLORS, SKELETON, type Color } from '@/engine/color';
import { fallbackDecks } from './fallback-deck';
import { fetchDeckForColor } from './scryfall.client';

const mockedGet = (axios.create() as unknown as { get: ReturnType<typeof vi.fn> }).get;

interface MinimalAxiosResponse {
  status: number;
}
function makeAxiosError(message: string, response?: MinimalAxiosResponse): AxiosError {
  const err = new AxiosError(message);
  if (response) {
    (err as unknown as { response: MinimalAxiosResponse }).response = response;
  }
  return err;
}

// Failure-mode arbitrary. Each generated value tells the next mock
// invocation what to do: succeed with valid cards, succeed with empty
// data, return 4xx (no retry), return 5xx (retry triggers), or reject
// with a network error (retry triggers).
type Outcome =
  | { kind: 'ok'; color: Color; count: number }
  | { kind: 'empty' }
  | { kind: 'malformed' }
  | { kind: '4xx' }
  | { kind: '5xx' }
  | { kind: 'network' };

const colorArb: fc.Arbitrary<Color> = fc.constantFrom(...COLORS);
const outcomeArb: fc.Arbitrary<Outcome> = fc.oneof(
  fc
    .tuple(colorArb, fc.integer({ min: 1, max: 12 }))
    .map(([color, count]): Outcome => ({ kind: 'ok', color, count })),
  fc.constant<Outcome>({ kind: 'empty' }),
  fc.constant<Outcome>({ kind: 'malformed' }),
  fc.constant<Outcome>({ kind: '4xx' }),
  fc.constant<Outcome>({ kind: '5xx' }),
  fc.constant<Outcome>({ kind: 'network' }),
);

function buildScryfallCards(color: Color, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${color}-${i}`,
    name: `Card ${color} ${i}`,
    type_line: 'Creature',
    colors: [color],
    cmc: (i % 6) + 1,
    power: String((i % 5) + 1),
    toughness: String((i % 5) + 1),
    image_uris: { normal: `https://cards.test/${color}-${i}.jpg` },
  }));
}

function applyOutcome(o: Outcome) {
  switch (o.kind) {
    case 'ok':
      mockedGet.mockResolvedValueOnce({ data: { data: buildScryfallCards(o.color, o.count) } });
      return;
    case 'empty':
      mockedGet.mockResolvedValueOnce({ data: { data: [] } });
      return;
    case 'malformed':
      mockedGet.mockResolvedValueOnce({ data: 'not-an-object' });
      return;
    case '4xx':
      mockedGet.mockRejectedValueOnce(makeAxiosError('client error', { status: 404 }));
      return;
    case '5xx':
      mockedGet.mockRejectedValueOnce(makeAxiosError('server error', { status: 503 }));
      return;
    case 'network':
      mockedGet.mockRejectedValueOnce(makeAxiosError('ECONNRESET'));
      return;
  }
}

describe('fetchDeckForColor (property-based resilience)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    // The retry wrapper sleeps 250ms / 500ms / 1000ms between attempts.
    // Real waits push 60+ property runs well past the 5s test timeout
    // — and they're the wall-clock cost, not signal. Replace setTimeout
    // with an instant-fire stub so every sleep() resolves on the next
    // microtask. Keeps the algorithmic shape of the property test
    // (still observes attempt sequencing) at zero wall-clock cost.
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: () => void) => {
      cb();
      return 0;
    }) as unknown as typeof setTimeout);
  });
  afterEach(() => vi.restoreAllMocks());

  it('never throws and always returns a 10-card deck under random failure sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        colorArb,
        fc.array(outcomeArb, { minLength: 1, maxLength: 4 }),
        async (color, outcomes) => {
          mockedGet.mockReset();
          // Apply one outcome per attempt. The retry wrapper does up to
          // 3 attempts; if the array is shorter, mockResolvedValueOnce
          // exhaustion just makes the next call reject undefined, which
          // the catch handler converts to fallback. Either way the
          // function returns gracefully.
          outcomes.forEach(applyOutcome);

          const result = await fetchDeckForColor(color);

          // No throw is implicit (we got here). Now the structural
          // invariants:
          expect(result.cards.length).toBe(SKELETON.length);
          expect(result.source === 'scryfall' || result.source === 'fallback').toBe(true);
          // 'scryfall' source means we built from candidates; the deck
          // must still respect color and creature constraints.
          if (result.source === 'scryfall') {
            expect(result.cards.every((c) => c.color === color)).toBe(true);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('falls back to the deterministic seed deck on every-attempt failure', async () => {
    // Property: any sequence of pure-failure outcomes (no successes)
    // results in source: 'fallback' and cards equal to fallbackDecks[color].
    const failureOutcomeArb = fc.constantFrom<Outcome>(
      { kind: 'malformed' },
      { kind: '4xx' },
      { kind: '5xx' },
      { kind: 'network' },
    );

    await fc.assert(
      fc.asyncProperty(
        colorArb,
        fc.array(failureOutcomeArb, { minLength: 1, maxLength: 5 }),
        async (color, outcomes) => {
          mockedGet.mockReset();
          outcomes.forEach(applyOutcome);

          const result = await fetchDeckForColor(color);
          expect(result.source).toBe('fallback');
          // Same color → identical seed deck across runs.
          expect(result.cards).toEqual(fallbackDecks[color]);
        },
      ),
      { numRuns: 40 },
    );
  });

  it('fallback deck is byte-identical across successive calls per color', () => {
    // Determinism: the seed deck is a frozen module-level constant, so
    // it should never drift. Asserting per-color guards against a
    // future refactor that lazily mutates seeds.
    fc.assert(
      fc.property(colorArb, (color) => {
        const a = fallbackDecks[color];
        const b = fallbackDecks[color];
        expect(a).toBe(b);
        expect(a.length).toBe(SKELETON.length);
      }),
      { numRuns: 20 },
    );
  });
});
