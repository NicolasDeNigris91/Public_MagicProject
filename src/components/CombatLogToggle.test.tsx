import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CombatLogToggle } from './CombatLogToggle';

describe('CombatLogToggle', () => {
  it('exposes aria-expanded that mirrors the open prop', () => {
    const { rerender } = render(<CombatLogToggle open={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
    rerender(<CombatLogToggle open onToggle={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true');
  });

  it('aria-controls points at the match-log region and aria-keyshortcuts advertises L', () => {
    render(<CombatLogToggle open={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-controls')).toBe('match-log');
    expect(btn.getAttribute('aria-keyshortcuts')).toBe('L');
  });

  it('label flips between open / close depending on the panel state', () => {
    const { rerender } = render(<CombatLogToggle open={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/Abrir|Open/i);
    rerender(<CombatLogToggle open onToggle={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/Fechar|Close/i);
  });

  it('clicking calls onToggle exactly once', async () => {
    const onToggle = vi.fn();
    render(<CombatLogToggle open={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
