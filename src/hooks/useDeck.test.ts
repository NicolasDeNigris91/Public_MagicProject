import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/scryfall.client', () => ({
  fetchDeckForColor: vi.fn(),
}));

import { fetchDeckForColor } from '@/services/scryfall.client';
import { useGameStore } from '@/store/useGameStore';
import { useDeck } from './useDeck';
import { cardId, type ICard } from '@/engine/types';

function makeCard(id: string): ICard {
  return {
    id: cardId(id),
    name: `C-${id}`,
    power: 1,
    toughness: 1,
    cmc: 0,
    manaCost: '{1}',
    typeLine: 'Creature',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: id,
  };
}

const SCRY_OK = (id: string) => ({
  cards: Array.from({ length: 10 }, (_, i) => makeCard(`${id}-${i}`)),
  source: 'scryfall' as const,
});
const FALLBACK_OK = (id: string) => ({
  cards: Array.from({ length: 10 }, (_, i) => makeCard(`${id}-${i}`)),
  source: 'fallback' as const,
});

describe('useDeck', () => {
  beforeEach(() => {
    vi.mocked(fetchDeckForColor).mockReset();
    useGameStore.setState({ gameLog: [], initialized: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ready=false while playerColor is null', () => {
    const { result } = renderHook(() => useDeck(null));
    expect(result.current.ready).toBe(false);
    expect(fetchDeckForColor).not.toHaveBeenCalled();
  });

  it('loads both decks in parallel and reports source=scryfall when both succeed via API', async () => {
    vi.mocked(fetchDeckForColor)
      .mockResolvedValueOnce(SCRY_OK('p'))
      .mockResolvedValueOnce(SCRY_OK('o'));

    const { result } = renderHook(() => useDeck('R'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.source).toBe('scryfall');
    expect(result.current.opponentColor).not.toBe('R');
    expect(fetchDeckForColor).toHaveBeenCalledTimes(2);
    expect(useGameStore.getState().initialized).toBe(true);
  });

  it("reports source='fallback' if either side returns the offline deck", async () => {
    vi.mocked(fetchDeckForColor)
      .mockResolvedValueOnce(SCRY_OK('p'))
      .mockResolvedValueOnce(FALLBACK_OK('o'));

    const { result } = renderHook(() => useDeck('R'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.source).toBe('fallback');
    // The fallback path also pushes an assertive announcement so the
    // user is told the API was unreachable.
    const log = useGameStore.getState().gameLog;
    expect(log.some((e) => e.priority === 'assertive' && /Scryfall/i.test(e.message))).toBe(true);
  });

  it('skips the late initGame if the hook unmounts mid-fetch', async () => {
    let resolveP: (v: ReturnType<typeof SCRY_OK>) => void = () => {};
    let resolveO: (v: ReturnType<typeof SCRY_OK>) => void = () => {};
    vi.mocked(fetchDeckForColor)
      .mockReturnValueOnce(new Promise((r) => (resolveP = r)))
      .mockReturnValueOnce(new Promise((r) => (resolveO = r)));

    const { unmount } = renderHook(() => useDeck('R'));
    unmount();
    // Resolve after the cleanup runs — initGame must not fire because
    // cancelledRef short-circuits the post-await body.
    const before = useGameStore.getState().generation;
    await act(async () => {
      resolveP(SCRY_OK('p'));
      resolveO(SCRY_OK('o'));
      // Yield twice so both promise microtasks flush.
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useGameStore.getState().generation).toBe(before);
  });

  it('restart() refetches and bumps the generation counter', async () => {
    vi.mocked(fetchDeckForColor)
      .mockResolvedValueOnce(SCRY_OK('p1'))
      .mockResolvedValueOnce(SCRY_OK('o1'))
      .mockResolvedValueOnce(SCRY_OK('p2'))
      .mockResolvedValueOnce(SCRY_OK('o2'));

    const { result } = renderHook(() => useDeck('R'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const gen1 = useGameStore.getState().generation;

    await act(async () => {
      result.current.restart();
    });
    await waitFor(() => expect(useGameStore.getState().generation).toBeGreaterThan(gen1));
    expect(fetchDeckForColor).toHaveBeenCalledTimes(4);
  });
});
