import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SKELETON } from '@/engine/color';
import { fallbackDecks } from './fallback-deck';
import { fetchColorArt, fetchDeckForColor } from './scryfall.client';

const mockedFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockedFetch);
  mockedFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Lightweight fetch-Response stand-in. The client only reads
 * `ok`, `status`, `statusText`, and `json()` so we don't need a full
 * Response polyfill — a plain object with those four members suffices
 * across jsdom and node test environments alike.
 */
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'HTTP error',
    json: async () => body,
  };
}

function statusResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'HTTP error',
    json: async () => ({}),
  };
}

function scryfallCard(opts: {
  id: string;
  colors: string[];
  cmc: number;
  power: number;
  toughness: number;
  /** Omit to simulate a Scryfall card with no images (rare layouts,
   *  some promos). Adapter will produce imageUrl: ''. */
  withImage?: boolean;
}) {
  const withImage = opts.withImage ?? true;
  return {
    id: opts.id,
    name: opts.id,
    type_line: 'Creature',
    colors: opts.colors,
    cmc: opts.cmc,
    power: String(opts.power),
    toughness: String(opts.toughness),
    ...(withImage
      ? { image_uris: { normal: `https://cards.scryfall.io/normal/${opts.id}.jpg` } }
      : {}),
  };
}

describe('fetchDeckForColor', () => {
  it('builds a 10-card deck from Scryfall candidates', async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [
          scryfallCard({ id: 'c1', colors: ['R'], cmc: 1, power: 2, toughness: 1 }),
          scryfallCard({ id: 'c2', colors: ['R'], cmc: 1, power: 1, toughness: 2 }),
          scryfallCard({ id: 'c3', colors: ['R'], cmc: 2, power: 2, toughness: 2 }),
          scryfallCard({ id: 'c4', colors: ['R'], cmc: 2, power: 2, toughness: 3 }),
          scryfallCard({ id: 'c5', colors: ['R'], cmc: 3, power: 3, toughness: 3 }),
          scryfallCard({ id: 'c6', colors: ['R'], cmc: 3, power: 2, toughness: 3 }),
          scryfallCard({ id: 'c7', colors: ['R'], cmc: 4, power: 3, toughness: 4 }),
          scryfallCard({ id: 'c8', colors: ['R'], cmc: 5, power: 4, toughness: 4 }),
          scryfallCard({ id: 'c9', colors: ['R'], cmc: 6, power: 5, toughness: 5 }),
          scryfallCard({ id: 'c10', colors: ['R'], cmc: 2, power: 1, toughness: 4 }),
        ],
      }),
    );
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('scryfall');
    expect(result.cards).toHaveLength(SKELETON.length);
    expect(result.cards.every((c) => c.color === 'R')).toBe(true);
  });

  it('falls back per slot when candidates are missing for that slot', async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [scryfallCard({ id: 'c1', colors: ['R'], cmc: 1, power: 2, toughness: 1 })],
      }),
    );
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('scryfall');
    // slot 0 uses the Scryfall candidate; the rest come from R seeds.
    expect(result.cards[0]!.id).toBe('c1');
    expect(result.cards[1]!.id).toBe(fallbackDecks.R[1]!.id);
    expect(result.cards[9]!.id).toBe(fallbackDecks.R[9]!.id);
  });

  it('falls back to the full color seed deck on network error', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('boom'));
    const result = await fetchDeckForColor('G');
    expect(result.source).toBe('fallback');
    expect(result.cards.map((c) => c.id)).toEqual(fallbackDecks.G.map((c) => c.id));
  });

  it('drops multicolor survivors returned by the search', async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [scryfallCard({ id: 'rg', colors: ['R', 'G'], cmc: 1, power: 2, toughness: 1 })],
      }),
    );
    const result = await fetchDeckForColor('R');
    // rg is multicolor, so deriveColor yields undefined, so it's ignored.
    expect(result.cards[0]!.id).toBe(fallbackDecks.R[0]!.id);
  });

  it('drops candidates without an image so the deck never shows the blank fallback', async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [
          scryfallCard({
            id: 'noimg',
            colors: ['R'],
            cmc: 1,
            power: 2,
            toughness: 1,
            withImage: false,
          }),
        ],
      }),
    );
    const result = await fetchDeckForColor('R');
    // The image-less candidate is rejected; slot 0 falls back to the seed.
    expect(result.cards[0]!.id).toBe(fallbackDecks.R[0]!.id);
  });

  it('retries on transient network failure and succeeds on the second attempt', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(
      jsonResponse({
        data: [scryfallCard({ id: 'rg1', colors: ['R'], cmc: 1, power: 2, toughness: 1 })],
      }),
    );
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('scryfall');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx response and gives up after the third attempt, falling back', async () => {
    mockedFetch
      .mockResolvedValueOnce(statusResponse(503))
      .mockResolvedValueOnce(statusResponse(503))
      .mockResolvedValueOnce(statusResponse(503));
    const result = await fetchDeckForColor('B');
    expect(result.source).toBe('fallback');
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 4xx response — caller is wrong, retry will not help', async () => {
    mockedFetch.mockResolvedValueOnce(statusResponse(400));
    const result = await fetchDeckForColor('U');
    expect(result.source).toBe('fallback');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('malformed envelope (response is a primitive, not an object) falls back with error=Malformed envelope', async () => {
    // ScryfallSearchResponseSchema is z.object().passthrough() — defaults
    // a missing `data` field to []. To trip the safeParse failure branch
    // we have to pass a non-object: a string slips through fetch.json().
    mockedFetch.mockResolvedValueOnce(jsonResponse('not an object'));
    const result = await fetchDeckForColor('W');
    expect(result.source).toBe('fallback');
    expect(result.error).toBe('Malformed envelope');
    expect(result.cards.map((c) => c.id)).toEqual(fallbackDecks.W.map((c) => c.id));
  });

  it('honors prefers-reduced-data: skips the search and returns the seed deck', async () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: q === '(prefers-reduced-data: reduce)',
          media: q,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    try {
      const result = await fetchDeckForColor('R');
      expect(result.source).toBe('fallback');
      expect(result.error).toBeUndefined();
      expect(mockedFetch).not.toHaveBeenCalled();
      expect(result.cards).toEqual(fallbackDecks.R);
      // Seed cards have empty imageUrls so battlefield/hand will
      // render the local fallback artwork without HTTP image loads.
      expect(result.cards.every((c) => c.imageUrl === '')).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('empty candidates after filter falls back with error=Empty response', async () => {
    // Returns a card whose color filter knocks it out — leaves the
    // candidates array empty and trips the second guard.
    mockedFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [scryfallCard({ id: 'wrong', colors: ['G'], cmc: 1, power: 2, toughness: 1 })],
      }),
    );
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('fallback');
    expect(result.error).toBe('Empty response');
  });
});

describe('fetchColorArt', () => {
  it('returns art_crop URLs keyed by color when every fetch succeeds', async () => {
    // 5 colors, each gets a /cards/named call. Mock once per color
    // with a distinct art_crop URL we can identify in the result.
    for (let i = 0; i < 5; i++) {
      mockedFetch.mockResolvedValueOnce(
        jsonResponse({
          id: `art-${i}`,
          name: `Art ${i}`,
          type_line: 'Creature',
          colors: ['R'],
          cmc: 1,
          power: '1',
          toughness: '1',
          image_uris: { normal: 'irrelevant', art_crop: `https://art.test/${i}.jpg` },
        }),
      );
    }
    const result = await fetchColorArt();
    expect(Object.keys(result).length).toBe(5);
    Object.values(result).forEach((url) => expect(url).toMatch(/^https:\/\/art\.test\/\d\.jpg$/));
  });

  it('skips colors whose response fails schema validation', async () => {
    mockedFetch
      .mockResolvedValueOnce(jsonResponse({ not: 'a card' })) // W: schema fails
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'u1',
          name: 'U Card',
          type_line: 'Creature',
          colors: ['U'],
          cmc: 1,
          power: '1',
          toughness: '1',
          image_uris: { normal: '', art_crop: 'https://art.test/u.jpg' },
        }),
      )
      .mockRejectedValueOnce(new Error('B network')) // B: rejects
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'r1',
          name: 'R Card',
          type_line: 'Creature',
          colors: ['R'],
          cmc: 1,
          power: '1',
          toughness: '1',
          image_uris: { normal: '', art_crop: 'https://art.test/r.jpg' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(null)); // G: schema fails (null is not an object)
    const result = await fetchColorArt();
    // Only U and R have valid art_crop URLs; the rest are absent.
    expect(result.U).toBe('https://art.test/u.jpg');
    expect(result.R).toBe('https://art.test/r.jpg');
    expect(result.W).toBeUndefined();
    expect(result.B).toBeUndefined();
    expect(result.G).toBeUndefined();
  });

  it('honors prefers-reduced-data: returns {} without issuing any network requests', async () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: q === '(prefers-reduced-data: reduce)',
          media: q,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    try {
      const result = await fetchColorArt();
      expect(result).toEqual({});
      expect(mockedFetch).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('reads art_crop from card_faces[0].image_uris when image_uris is absent (DFC)', async () => {
    // Double-faced cards put image_uris on each face, not the root.
    // The fetcher's fallback chain should pick the front face.
    for (let i = 0; i < 5; i++) {
      mockedFetch.mockResolvedValueOnce(
        jsonResponse({
          id: `dfc-${i}`,
          name: `DFC ${i}`,
          type_line: 'Creature',
          colors: ['R'],
          cmc: 1,
          power: '1',
          toughness: '1',
          card_faces: [
            { image_uris: { normal: '', art_crop: `https://art.test/dfc-${i}.jpg` } },
            { image_uris: { normal: '', art_crop: 'back-face' } },
          ],
        }),
      );
    }
    const result = await fetchColorArt();
    expect(Object.keys(result).length).toBe(5);
    Object.values(result).forEach((url) =>
      expect(url).toMatch(/^https:\/\/art\.test\/dfc-\d\.jpg$/),
    );
  });
});
