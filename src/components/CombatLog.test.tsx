import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CombatLog } from './CombatLog';
import { logEntryId, type LogEntry, type LogKind } from '@/engine/types';
import { useGameStore } from '@/store/useGameStore';

function entry(id: string, message: string, kind: LogKind | undefined): LogEntry {
  return {
    id: logEntryId(id),
    message,
    priority: 'polite',
    timestamp: 0,
    ...(kind ? { kind } : {}),
  };
}

afterEach(() => {
  // Unmount BEFORE clearing the store: leaving CombatLog subscribed
  // through the gameLog reset triggers an act() warning otherwise.
  cleanup();
  useGameStore.setState({ gameLog: [] });
});

describe('CombatLog', () => {
  it('renders the empty paragraph when gameLog has no entries', () => {
    render(<CombatLog open onClose={vi.fn()} />);
    // The empty state branch — no <ol> exists when there are no entries.
    expect(screen.queryByRole('list')).toBeNull();
    // The aside is still rendered with its label.
    expect(screen.getByRole('region', { name: /(log|registro)/i })).toBeInTheDocument();
  });

  it('renders one <li> per gameLog entry with its message visible', () => {
    useGameStore.setState({
      gameLog: [
        entry('e1', 'You drew Phyrexian Rager.', 'draw'),
        entry('e2', 'Turn 2. Your turn.', 'turn'),
        entry('e3', 'You played Goblin.', 'play'),
      ],
    });
    render(<CombatLog open onClose={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toMatch(/Phyrexian Rager/);
    expect(items[1]?.textContent).toMatch(/Turn 2/);
    expect(items[2]?.textContent).toMatch(/Goblin/);
  });

  it('renders the correct icon glyph for every LogKind', () => {
    // One entry per kind (plus an undefined-kind entry that should fall
    // back to the 'info' icon). Hits every branch in ICON_FOR + KIND_CLASS.
    const expected: Array<[string | undefined, string]> = [
      [undefined, '•'],
      ['info', '•'],
      ['turn', '◆'],
      ['draw', '↓'],
      ['play', '+'],
      ['combat', '⚔'],
      ['mana', '◎'],
      ['game-over', '★'],
    ];
    useGameStore.setState({
      gameLog: expected.map(([kind, _glyph], i) =>
        entry(`e${i}`, `entry ${i}`, kind as LogKind | undefined),
      ),
    });
    render(<CombatLog open onClose={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expected.forEach(([, glyph], i) => {
      expect(items[i]?.textContent).toContain(glyph);
    });
  });

  it('clicking the close button calls onClose', async () => {
    const onClose = vi.fn();
    render(<CombatLog open onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /(close|fechar)/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('open=false marks the panel inert (focus order skips it)', () => {
    render(<CombatLog open={false} onClose={vi.fn()} />);
    const panel = screen.getByRole('region', { name: /(log|registro)/i });
    // useInertWhile sets the `inert` attribute when the predicate (here !open)
    // is true. JSDOM exposes it as an attribute, not a property.
    expect(panel.hasAttribute('inert')).toBe(true);
  });
});
