import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { useAnnouncer } from './useAnnouncer';

const HOLD_MS = 1100;

function resetStore() {
  useGameStore.setState({ gameLog: [], generation: 0 });
}

describe('useAnnouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty polite and assertive slots', () => {
    const { result } = renderHook(() => useAnnouncer());
    expect(result.current.polite).toBe('');
    expect(result.current.assertive).toBe('');
    expect(result.current.politeKey).toBe(0);
    expect(result.current.assertiveKey).toBe(0);
  });

  it('drains polite messages one per HOLD_MS so screen readers can finish', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      useGameStore.getState().announce('first', 'polite');
      useGameStore.getState().announce('second', 'polite');
      useGameStore.getState().announce('third', 'polite');
    });

    // Effect runs immediately; first message is published.
    expect(result.current.polite).toBe('first');
    expect(result.current.politeKey).toBe(1);

    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    expect(result.current.polite).toBe('second');

    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    expect(result.current.polite).toBe('third');
  });

  it('routes assertive messages to the assertive slot independently of polite', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      useGameStore.getState().announce('info', 'polite');
      useGameStore.getState().announce('alert', 'assertive');
    });

    expect(result.current.polite).toBe('info');
    expect(result.current.assertive).toBe('alert');
  });

  it('forces a re-announce by bumping politeKey when the same string repeats', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      useGameStore.getState().announce('same', 'polite');
    });
    const firstKey = result.current.politeKey;

    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
      useGameStore.getState().announce('same', 'polite');
    });
    // The string is identical but the React key changes so
    // <LiveRegion key=...> remounts and AT re-reads the message.
    expect(result.current.polite).toBe('same');
    expect(result.current.politeKey).toBeGreaterThan(firstKey);
  });

  it('drops queued messages when generation advances (new match)', () => {
    const { result } = renderHook(() => useAnnouncer());

    act(() => {
      // Two messages queued, first published immediately, second waiting.
      useGameStore.getState().announce('match-1-info', 'polite');
      useGameStore.getState().announce('match-1-followup', 'polite');
    });
    expect(result.current.polite).toBe('match-1-info');

    // initGame bumps generation; the hook clears the queue and seeds
    // a fresh log entry. The currently published message holds until
    // its HOLD_MS expires, then the welcome line of the new match
    // takes over — match-1-followup is dropped, never read.
    act(() => {
      useGameStore.getState().initGame([], []);
    });
    expect(useGameStore.getState().generation).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    expect(result.current.polite).toContain('New match');
    expect(result.current.polite).not.toContain('followup');
  });
});
