import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveRegion } from './LiveRegion';
import { logEntryId, type LogEntry } from '@/engine/types';
import { useGameStore } from '@/store/useGameStore';

function entry(id: string, message: string, priority: 'polite' | 'assertive'): LogEntry {
  return { id: logEntryId(id), message, priority, timestamp: 0 };
}

afterEach(() => {
  cleanup();
  // Bumping generation drops the announcer's lastSeenId/queues, so the
  // next test starts on a clean slate even though the store is shared.
  useGameStore.setState((s) => ({ gameLog: [], generation: s.generation + 1 }));
});

describe('LiveRegion', () => {
  it('renders both live regions with role=status (polite) and role=alert (assertive)', () => {
    render(<LiveRegion />);
    // Roles imply aria-live; the component intentionally does not set
    // aria-live too (older NVDA double-announces when both are present).
    const polite = screen.getByRole('status');
    const assertive = screen.getByRole('alert');
    expect(polite.getAttribute('aria-atomic')).toBe('true');
    expect(assertive.getAttribute('aria-atomic')).toBe('true');
    // Visually hidden but accessible — sr-only class is the contract.
    expect(polite.className).toContain('sr-only');
    expect(assertive.className).toContain('sr-only');
  });

  it('seeded polite gameLog entries surface in the polite region', async () => {
    useGameStore.setState({
      gameLog: [entry('p1', 'Polite update one', 'polite')],
    });
    render(<LiveRegion />);
    // useAnnouncer holds messages for HOLD_MS — synchronously after mount,
    // the first polite message has been drained into state.
    const polite = await screen.findByRole('status');
    expect(polite.textContent).toBe('Polite update one');
  });

  it('seeded assertive gameLog entries route to the assertive region only', async () => {
    useGameStore.setState({
      gameLog: [entry('a1', 'Assertive blast', 'assertive')],
    });
    render(<LiveRegion />);
    const polite = await screen.findByRole('status');
    const assertive = await screen.findByRole('alert');
    expect(assertive.textContent).toBe('Assertive blast');
    expect(polite.textContent).toBe('');
  });
});
