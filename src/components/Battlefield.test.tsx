import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { cardId } from '@/engine/types';
import { Battlefield } from './Battlefield';
import type { ICard } from '@/engine/types';

function card(id: string, name: string): ICard {
  return {
    id: cardId(id),
    name,
    power: 2,
    toughness: 2,
    cmc: 2,
    manaCost: '{1}{R}',
    typeLine: 'Creature - Goblin',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: `${name}. Creature - Goblin. Mana cost 1 generic plus red. Power 2, toughness 2.`,
  };
}

describe('Battlefield', () => {
  it('aria-label reports zero creatures when empty', () => {
    render(<Battlefield label="Your field" cards={[]} />);
    const region = screen.getByRole('region', {
      name: /Your field\. 0 creatures on the battlefield\./,
    });
    expect(region).toBeInTheDocument();
  });

  it('aria-label reports the singular form when exactly one creature is present', () => {
    render(<Battlefield label="Your field" cards={[card('x', 'Goblin')]} />);
    const region = screen.getByRole('region', { name: /1 creature on the battlefield/ });
    expect(region).toBeInTheDocument();
  });

  it('aria-label reports plural for many creatures', () => {
    const cards = [card('x', 'A'), card('y', 'B'), card('z', 'C')];
    render(<Battlefield label="Your field" cards={cards} />);
    expect(
      screen.getByRole('region', { name: /3 creatures on the battlefield/ }),
    ).toBeInTheDocument();
  });

  it('renders a localized empty-state hint when no cards are present', () => {
    render(<Battlefield label="Your field" cards={[]} />);
    expect(screen.getByText(/sem criaturas em jogo|no creatures in play/i)).toBeInTheDocument();
  });

  it('forwards card clicks to onCardActivate', async () => {
    const onCardActivate = vi.fn();
    const userEvent = await import('@testing-library/user-event').then((m) => m.default);
    render(
      <Battlefield
        label="Your field"
        cards={[card('x', 'Goblin')]}
        onCardActivate={onCardActivate}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Goblin/ }));
    expect(onCardActivate).toHaveBeenCalledTimes(1);
    expect(onCardActivate.mock.calls[0]?.[0]?.id).toBe('x');
  });
});
