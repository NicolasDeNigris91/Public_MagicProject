import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorSelection } from './ColorSelection';
import { COLORS, COLOR_LABELS } from '@/engine/color';

describe('ColorSelection', () => {
  it('renders one button per color with name + flavor in its aria-label', () => {
    render(<ColorSelection onSelect={() => {}} />);
    for (const c of COLORS) {
      const btn = screen.getByRole('button', { name: new RegExp(COLOR_LABELS[c].name, 'i') });
      expect(btn.getAttribute('aria-label')).toContain(COLOR_LABELS[c].name);
      expect(btn.getAttribute('aria-label')).toContain(COLOR_LABELS[c].flavor);
    }
  });

  it('invokes onSelect with the chosen color on click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ColorSelection onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Vermelho/i }));
    expect(onSelect).toHaveBeenCalledWith('R');
  });

  it('moves focus with Left/Right arrows and selects on Enter', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ColorSelection onSelect={onSelect} />);
    const first = screen.getByRole('button', { name: /Branco/i });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Azul/i }));
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('U');
  });
});
