'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

// FIFO queue feeding two live regions. Cursor tracks last-seen entry by
// id (the gameLog gets trimmed from the head, so indices drift). Flush
// holds ~1100ms between messages so AT can finish. Generation bump on
// initGame drops stale queue items.
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
