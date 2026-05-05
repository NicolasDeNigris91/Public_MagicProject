import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => {
  const get = vi.fn();
  return {
    default: { create: () => ({ get }) },
    AxiosError: class AxiosError extends Error {},
    __esModule: true,
  };
});

import axios, { AxiosError } from 'axios';
import { SKELETON } from '@/engine/color';
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
  beforeEach(() => mockedGet.mockReset());

  it('builds a 10-card deck from Scryfall candidates', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
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
      },
    });
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('scryfall');
    expect(result.cards).toHaveLength(SKELETON.length);
    expect(result.cards.every((c) => c.color === 'R')).toBe(true);
  });

  it('falls back per slot when candidates are missing for that slot', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { data: [scryfallCard({ id: 'c1', colors: ['R'], cmc: 1, power: 2, toughness: 1 })] },
    });
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('scryfall');
    // slot 0 uses the Scryfall candidate; the rest come from R seeds.
    expect(result.cards[0]!.id).toBe('c1');
    expect(result.cards[1]!.id).toBe(fallbackDecks.R[1]!.id);
    expect(result.cards[9]!.id).toBe(fallbackDecks.R[9]!.id);
  });

  it('falls back to the full color seed deck on network error', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    const result = await fetchDeckForColor('G');
    expect(result.source).toBe('fallback');
    expect(result.cards.map((c) => c.id)).toEqual(fallbackDecks.G.map((c) => c.id));
  });

  it('drops multicolor survivors returned by the search', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [scryfallCard({ id: 'rg', colors: ['R', 'G'], cmc: 1, power: 2, toughness: 1 })],
      },
    });
    const result = await fetchDeckForColor('R');
    // rg is multicolor, so deriveColor yields undefined, so it's ignored.
    expect(result.cards[0]!.id).toBe(fallbackDecks.R[0]!.id);
  });

  it('drops candidates without an image so the deck never shows the blank fallback', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
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
      },
    });
    const result = await fetchDeckForColor('R');
    // The image-less candidate is rejected; slot 0 falls back to the seed.
    expect(result.cards[0]!.id).toBe(fallbackDecks.R[0]!.id);
  });

  it('retries on transient network failure and succeeds on the second attempt', async () => {
    mockedGet.mockRejectedValueOnce(makeAxiosError('ECONNRESET')).mockResolvedValueOnce({
      data: {
        data: [scryfallCard({ id: 'rg1', colors: ['R'], cmc: 1, power: 2, toughness: 1 })],
      },
    });
    const result = await fetchDeckForColor('R');
    expect(result.source).toBe('scryfall');
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx response and gives up after the third attempt, falling back', async () => {
    const fivexx = () => makeAxiosError('Service Unavailable', { status: 503 });
    mockedGet
      .mockRejectedValueOnce(fivexx())
      .mockRejectedValueOnce(fivexx())
      .mockRejectedValueOnce(fivexx());
    const result = await fetchDeckForColor('B');
    expect(result.source).toBe('fallback');
    expect(mockedGet).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 4xx response — caller is wrong, retry will not help', async () => {
    mockedGet.mockRejectedValueOnce(makeAxiosError('Bad Request', { status: 400 }));
    const result = await fetchDeckForColor('U');
    expect(result.source).toBe('fallback');
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});
