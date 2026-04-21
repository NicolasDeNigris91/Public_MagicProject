import axios, { AxiosError } from 'axios';
import type { ICard } from '@/engine/types';
import type { Color } from '@/engine/color';
import { buildDeckFromCandidates } from '@/engine/color';
import { adaptScryfallCard, type ScryfallCard } from '@/adapters/scryfall.adapter';
import { fallbackDecks } from './fallback-deck';

const http = axios.create({
  baseURL: 'https://api.scryfall.com',
  timeout: 8000,
  headers: {
    'User-Agent': 'mtg-tcg-a11y-portfolio/0.1',
    Accept: 'application/json',
  },
});

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
  try {
    const { data } = await http.get<{ data: ScryfallCard[] }>('/cards/search', {
      params: {
        q: `c=${color.toLowerCase()} t:creature cmc<=6 -t:token`,
        order: 'random',
        unique: 'cards',
      },
    });
    const candidates = (data.data ?? [])
      .map(adaptScryfallCard)
      .filter((c) => c.color === color && c.power > 0 && c.toughness > 0);
    if (candidates.length === 0) {
      return { cards: seeds, source: 'fallback', error: 'Empty response' };
    }
    return { cards: buildDeckFromCandidates(candidates, seeds), source: 'scryfall' };
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : 'Unknown error';
    return { cards: seeds, source: 'fallback', error: msg };
  }
}
