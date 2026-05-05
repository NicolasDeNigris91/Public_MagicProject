import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/scryfall.client', () => ({
  // Default: never-resolving promise so existing tests don't trigger
  // a setState after mount. Tests that care about the resolved state
  // override via mockResolvedValueOnce.
  fetchColorArt: vi.fn(() => new Promise(() => {})),
}));

import { COLORS, COLOR_LABELS } from '@/engine/color';
import { fetchColorArt } from '@/services/scryfall.client';
import { ColorSelection } from './ColorSelection';

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

  it('swaps the swatch for the card art thumbnail once fetchColorArt resolves', async () => {
    vi.mocked(fetchColorArt).mockResolvedValueOnce({
      W: 'https://cards.scryfall.io/art_crop/akroma.jpg',
    });
    render(<ColorSelection onSelect={() => {}} />);
    const whiteBtn = screen.getByRole('button', { name: /Branco/i });
    await waitFor(() => {
      const img = whiteBtn.querySelector('img');
      expect(img?.getAttribute('src')).toBe('https://cards.scryfall.io/art_crop/akroma.jpg');
    });
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
