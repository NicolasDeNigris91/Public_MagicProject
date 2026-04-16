'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

/**
 * FIFO queue -> two live regions.
 *
 * Why a queue, not "latest wins":
 *   During the opponent's turn the store fires many messages within a
 *   few hundred milliseconds (play card, attack 1, attack 2, ...).
 *   A naive "take the newest and drop the rest" approach silently
 *   eats announcements — the exact failure mode the live region is
 *   meant to prevent. Each event must be heard in order.
 *
 * Cursor by id, not index:
 *   The store caps `gameLog` to MAX_LOG entries and trims from the
 *   head. An absolute-index cursor would misalign after the first
 *   truncation; tracking the last-seen entry id survives truncation.
 *
 * Flush cadence:
 *   Each message holds ~1100 ms before the next — roughly the natural
 *   speech rate for a short sentence. Gives AT time to finish.
 *
 * Generation reset:
 *   `initGame` bumps `generation` and replaces `gameLog`. When we see
 *   generation advance we drop pending queue items from the old match
 *   and reset the cursor.
 *
 * Nonce key:
 *   The React `key` on the live-region DOM node (LiveRegion.tsx) is
 *   bumped on every flush so repeated identical messages remount the
 *   node and re-trigger an announcement.
 */
export interface AnnouncerState {
  polite: string;
  politeKey: number;
  assertive: string;
  assertiveKey: number;
}

const HOLD_MS = 1100;

export function useAnnouncer(): AnnouncerState {
  const log = useGameStore((s) => s.gameLog);
  const generation = useGameStore((s) => s.generation);
  const [state, setState] = useState<AnnouncerState>({
    polite: '', politeKey: 0, assertive: '', assertiveKey: 0,
  });

  const lastSeenId = useRef<string | null>(null);
  const lastGen = useRef(generation);
  const politeQueue = useRef<string[]>([]);
  const assertiveQueue = useRef<string[]>([]);
  const politeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (generation !== lastGen.current) {
      lastGen.current = generation;
      lastSeenId.current = null;
      politeQueue.current = [];
      assertiveQueue.current = [];
    }

    // Find the position right after the last entry we processed.
    // If lastSeenId is missing from the log (trimmed or fresh game),
    // start from 0. findIndex returns -1 → +1 = 0, which is also fine
    // but then we'd re-announce entries; use explicit null check.
    const startIdx = lastSeenId.current
      ? (() => {
          const idx = log.findIndex((e) => e.id === lastSeenId.current);
          return idx < 0 ? log.length : idx + 1;
        })()
      : 0;

    if (startIdx >= log.length) return;

    for (let i = startIdx; i < log.length; i++) {
      const entry = log[i];
      if (!entry) continue;
      if (entry.priority === 'assertive') assertiveQueue.current.push(entry.message);
      else politeQueue.current.push(entry.message);
    }
    const last = log[log.length - 1];
    lastSeenId.current = last ? last.id : null;

    const flushPolite = () => {
      if (politeTimer.current) return;
      const msg = politeQueue.current.shift();
      if (msg === undefined) return;
      setState((s) => ({ ...s, polite: msg, politeKey: s.politeKey + 1 }));
      politeTimer.current = setTimeout(() => {
        politeTimer.current = null;
        flushPolite();
      }, HOLD_MS);
    };

    const flushAssertive = () => {
      if (assertiveTimer.current) return;
      const msg = assertiveQueue.current.shift();
      if (msg === undefined) return;
      setState((s) => ({ ...s, assertive: msg, assertiveKey: s.assertiveKey + 1 }));
      assertiveTimer.current = setTimeout(() => {
        assertiveTimer.current = null;
        flushAssertive();
      }, HOLD_MS);
    };

    flushPolite();
    flushAssertive();
  }, [log, generation]);

  useEffect(() => {
    return () => {
      if (politeTimer.current) clearTimeout(politeTimer.current);
      if (assertiveTimer.current) clearTimeout(assertiveTimer.current);
    };
  }, []);

  return state;
}
