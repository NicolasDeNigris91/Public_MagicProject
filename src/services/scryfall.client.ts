import axios, { AxiosError } from 'axios';
import type { ICard } from '@/engine/types';
import { adaptScryfallCard, type ScryfallCard } from '@/adapters/scryfall.adapter';
// stopgap until Task 5 — flatten for the existing fetchRandomCreatures shape
import { fallbackDecks } from './fallback-deck';
const fallbackDeck = [...fallbackDecks.W, ...fallbackDecks.R];

const http = axios.create({
  baseURL: 'https://api.scryfall.com',
  timeout: 8000,
  headers: {
    // Scryfall requires a User-Agent identifying the client.
    // In the browser, UA is controlled by the browser; this is a no-op there
    // but documents intent and works server-side.
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
 * Random creatures. Scryfall recommends ≤10 req/s with ≥50ms spacing;
 * one call per init is well under the budget.
 */
export async function fetchRandomCreatures(count = 20): Promise<FetchResult> {
  try {
    const { data } = await http.get<{ data: ScryfallCard[] }>('/cards/search', {
      params: { q: 'type:creature', order: 'random', unique: 'cards' },
    });
    const cards = (data.data ?? []).slice(0, count).map(adaptScryfallCard);
    if (cards.length === 0) {
      return { cards: fallbackDeck, source: 'fallback', error: 'Empty response' };
    }
    return { cards, source: 'scryfall' };
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : 'Unknown error';
    return { cards: fallbackDeck, source: 'fallback', error: msg };
  }
}
