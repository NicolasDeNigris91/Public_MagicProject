import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { cardId } from '@/engine/types';
import { Hand } from './Hand';
import type { ICard } from '@/engine/types';

function card(id: string, name: string): ICard {
  return {
    id: cardId(id),
    name,
    power: 1,
    toughness: 1,
    cmc: 1,
    manaCost: '{R}',
    typeLine: 'Creature - Goblin',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: `${name}. Creature - Goblin. Mana cost red. Power 1, toughness 1.`,
  };
}

const HAND: ICard[] = [
  card('a', 'Card A'),
  card('b', 'Card B'),
  card('c', 'Card C'),
  card('d', 'Card D'),
  card('e', 'Card E'),
];

describe('Hand keyboard navigation', () => {
  it('ArrowRight moves focus from first to second card', async () => {
    render(<Hand hand={HAND} label="Your hand" onActivate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[0]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('ArrowLeft from first wraps to last card', async () => {
    render(<Hand hand={HAND} label="Your hand" onActivate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[0]?.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('ArrowRight from last wraps to first', async () => {
    render(<Hand hand={HAND} label="Your hand" onActivate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('Home jumps focus to the first card from anywhere', async () => {
    render(<Hand hand={HAND} label="Your hand" onActivate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[2]?.focus();
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('End jumps focus to the last card from anywhere', async () => {
    render(<Hand hand={HAND} label="Your hand" onActivate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons[1]?.focus();
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('Enter on a focused card invokes onActivate with that card', async () => {
    const onActivate = vi.fn();
    render(<Hand hand={HAND} label="Your hand" onActivate={onActivate} />);
    const buttons = screen.getAllByRole('button');
    buttons[2]?.focus();
    await userEvent.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0]?.[0]?.id).toBe('c');
  });

  it('exposes aria-posinset and aria-setsize on each listitem', () => {
    render(<Hand hand={HAND} label="Your hand" onActivate={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    items.forEach((li, i) => {
      expect(li.getAttribute('aria-posinset')).toBe(String(i + 1));
      expect(li.getAttribute('aria-setsize')).toBe('5');
    });
  });

  it('hidden mode renders card backs instead of card buttons', () => {
    render(<Hand hand={HAND} label="Opponent" onActivate={vi.fn()} hidden compact />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
