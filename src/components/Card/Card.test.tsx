import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card';
import type { ICard } from '@/engine/types';

const sample: ICard = {
  id: 'c1',
  name: 'Test Goblin',
  power: 1,
  toughness: 1,
  cmc: 1,
  manaCost: '{R}',
  typeLine: 'Creature - Goblin',
  oracleText: 'Haste.',
  imageUrl: '',
  imageUrlSmall: '',
  accessibilityDescription:
    'Test Goblin. Creature - Goblin. Mana cost red. Power 1, toughness 1. Haste.',
};

describe('Card - onInspect', () => {
  it('pressing "i" with focus invokes onInspect (not onActivate)', async () => {
    const onActivate = vi.fn();
    const onInspect = vi.fn();
    render(<Card card={sample} onActivate={onActivate} onInspect={onInspect} />);
    // Anchor: the outer card button's accessible name starts with "Test Goblin."
    // (the card.accessibilityDescription); the inspect span's aria-label is
    // "Inspect Test Goblin" - different leading character.
    const btn = screen.getByRole('button', { name: /^Test Goblin\./ });
    btn.focus();
    await userEvent.keyboard('i');
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('renders a hidden-by-default "ⓘ" inspect button when onInspect is provided', () => {
    render(<Card card={sample} onActivate={vi.fn()} onInspect={vi.fn()} />);
    const inspectBtn = screen.getByRole('button', { name: /inspect/i });
    expect(inspectBtn).toBeInTheDocument();
  });

  it('does NOT render the "ⓘ" button when onInspect is omitted', () => {
    render(<Card card={sample} onActivate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /inspect/i })).toBeNull();
  });

  it('clicking the "ⓘ" button calls onInspect (not onActivate)', async () => {
    const onActivate = vi.fn();
    const onInspect = vi.fn();
    render(<Card card={sample} onActivate={onActivate} onInspect={onInspect} />);
    await userEvent.click(screen.getByRole('button', { name: /inspect/i }));
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });
});
