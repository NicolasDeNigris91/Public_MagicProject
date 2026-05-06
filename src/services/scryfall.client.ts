import axios, { AxiosError } from 'axios';
import {
  adaptScryfallCard,
  parseScryfallCards,
  ScryfallCardSchema,
  ScryfallSearchResponseSchema,
} from '@/adapters/scryfall.adapter';
import { COLORS, buildDeckFromCandidates } from '@/engine/color';
import { prefersReducedData } from '@/utils/media';
import { fallbackDecks } from './fallback-deck';
import type { Color } from '@/engine/color';
import type { ICard } from '@/engine/types';

const http = axios.create({
  baseURL: 'https://api.scryfall.com',
  timeout: 8000,
  headers: {
    'User-Agent': 'mtg-tcg-a11y-portfolio/0.1',
    Accept: 'application/json',
  },
});

// Visual-regression / E2E hook: when `NEXT_PUBLIC_MTG_DETERMINISTIC=1`
// is inlined at build time, the deck loader skips Scryfall entirely
// and the color picker omits its art fetch. The result is a pixel-
// identical first render across runs, which is what `toHaveScreenshot`
// needs to be meaningful. Production builds default to false.
const DETERMINISTIC = process.env.NEXT_PUBLIC_MTG_DETERMINISTIC === '1';

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

function shouldRetry(err: unknown): boolean {
  // Retry on transient network failures (no response) and 5xx server
  // errors. Do NOT retry on 4xx — those mean the caller is wrong
  // (bad query, throttle) and another attempt won't help. 429
  // technically benefits from retry-after handling but Scryfall
  // documents soft rate limits; we let it fall through to the seed
  // deck rather than risk hammering them.
  if (!(err instanceof AxiosError)) return false;
  if (!err.response) return true;
  const status = err.response.status;
  return status >= 500 && status < 600;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tiny retry-with-exponential-backoff wrapper. 3 total attempts at
 * 0 / 250 / 500ms. Exposed only inside this module so the deck and
 * art fetches share the same policy.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === RETRY_MAX_ATTEMPTS - 1 || !shouldRetry(err)) throw err;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastErr;
}

export interface FetchResult {
  cards: ICard[];
  source: 'scryfall' | 'fallback';
  error?: string;
}

/**
 * Fetch a balanced 10-card mono-color deck.
 *
 * Strategy: one `/cards/search` call per color, filter strictly to
 * the requested color, then `buildDeckFromCandidates` fits the pool
 * into the 10-slot skeleton locally. Any slot a candidate can't
 * cover falls back to the per-color seed at that slot position.
 * Whole-query failure returns the full per-color seed deck.
 */
export async function fetchDeckForColor(color: Color): Promise<FetchResult> {
  const seeds = fallbackDecks[color];
  if (DETERMINISTIC) return { cards: seeds, source: 'fallback' };
  // prefers-reduced-data: skip the cards/search round-trip AND keep
  // the imageUrl-empty seed cards so battlefield/hand renders with
  // CardFallback instead of pulling 10 art crops from the CDN.
  if (prefersReducedData()) return { cards: seeds, source: 'fallback' };
  try {
    const { data } = await withRetry(() =>
      http.get<unknown>('/cards/search', {
        params: {
          q: `c=${color.toLowerCase()} t:creature cmc<=6 -t:token`,
          order: 'random',
          unique: 'cards',
        },
      }),
    );
    // Validate envelope shape, then validate each card individually.
    // A schema drift on one card drops that card; the whole response
    // only fails if `data.data` itself isn't an array.
    const envelope = ScryfallSearchResponseSchema.safeParse(data);
    if (!envelope.success) {
      return { cards: seeds, source: 'fallback', error: 'Malformed envelope' };
    }
    const validCards = parseScryfallCards(envelope.data.data);
    const candidates = validCards
      .map(adaptScryfallCard)
      .filter((c) => c.color === color && c.power > 0 && c.toughness > 0 && c.imageUrl !== '');
    if (candidates.length === 0) {
      return { cards: seeds, source: 'fallback', error: 'Empty response' };
    }
    return { cards: buildDeckFromCandidates(candidates, seeds), source: 'scryfall' };
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : 'Unknown error';
    return { cards: seeds, source: 'fallback', error: msg };
  }
}

/** One iconic creature per color used as the selector's art thumbnail. */
export const COLOR_ART_CARDS: Record<Color, string> = {
  W: 'Akroma, Angel of Wrath',
  U: 'Hullbreaker Horror',
  B: 'Phage the Untouchable',
  R: 'Flametongue Kavu',
  G: 'Primeval Titan',
};

async function fetchArtCrop(exactName: string): Promise<string | null> {
  try {
    const { data } = await withRetry(() =>
      http.get<unknown>('/cards/named', {
        params: { exact: exactName },
      }),
    );
    const parsed = ScryfallCardSchema.safeParse(data);
    if (!parsed.success) return null;
    const uris = parsed.data.image_uris ?? parsed.data.card_faces?.[0]?.image_uris;
    return uris?.art_crop ?? null;
  } catch {
    return null;
  }
}

/** Fetch art_crop for every color's icon card in parallel. Missing
 *  entries silently fall back to the solid swatches in the UI. */
export async function fetchColorArt(): Promise<Partial<Record<Color, string>>> {
  if (DETERMINISTIC) return {};
  // Honor prefers-reduced-data: callers degrade gracefully to the
  // solid color swatches when the map comes back empty.
  if (prefersReducedData()) return {};
  const entries = await Promise.all(
    COLORS.map(async (c) => [c, await fetchArtCrop(COLOR_ART_CARDS[c])] as const),
  );
  const out: Partial<Record<Color, string>> = {};
  for (const [c, url] of entries) if (url) out[c] = url;
  return out;
}
