import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CardInspector } from './CardInspector';
import type { ICard } from '@/engine/types';

const sampleCard: ICard = {
  id: 'card-1',
  name: 'Shivan Dragon',
  power: 5,
  toughness: 5, cmc: 6,
  manaCost: '{4}{R}{R}',
  typeLine: 'Creature - Dragon',
  oracleText: 'Flying. {R}: Shivan Dragon gets +1/+0 until end of turn.',
  imageUrl: 'https://cards.scryfall.io/normal/shivan.jpg',
  imageUrlSmall: 'https://cards.scryfall.io/small/shivan.jpg',
  accessibilityDescription:
    'Shivan Dragon. Creature - Dragon. Mana cost 4 generic plus 2 red. Power 5, toughness 5. Flying. Red mana: Shivan Dragon gets +1/+0 until end of turn.',
};

describe('CardInspector', () => {
  it('renders the card name as title', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Shivan Dragon' })).toBeInTheDocument();
  });

  it('renders type line, mana cost and P/T', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Creature - Dragon')).toBeInTheDocument();
    expect(screen.getByText(/4 generic plus 2 red/)).toBeInTheDocument();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  it('renders the rules text', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Flying\./)).toBeInTheDocument();
  });

  it('labels dialog by inspector-title id', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'inspector-title');
    expect(document.getElementById('inspector-title')?.textContent).toBe(sampleCard.name);
  });

  it('renders one button per action', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[
          { label: 'Play to field', variant: 'primary', onClick: vi.fn() },
          { label: 'Cancel', variant: 'secondary', onClick: vi.fn() },
        ]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Play to field' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders CardFallback when imageUrl is empty', () => {
    render(
      <CardInspector
        card={{ ...sampleCard, imageUrl: '' }}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    const headings = screen.getAllByText('Shivan Dragon');
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('swaps to fallback on image error', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    const img = document.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    const headings = screen.getAllByText('Shivan Dragon');
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: onClose }]}
        onClose={onClose}
      />,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', async () => {
    const onClose = vi.fn();
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: onClose }]}
        onClose={onClose}
      />,
    );
    const backdrop = document.querySelector<HTMLElement>('[role="dialog"]')
      ?.parentElement as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks inside the dialog', async () => {
    const onClose = vi.fn();
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: onClose }]}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('heading', { name: 'Shivan Dragon' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses the primary action initially', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[
          { label: 'Play to field', variant: 'primary', onClick: vi.fn() },
          { label: 'Cancel', variant: 'secondary', onClick: vi.fn() },
        ]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Play to field' })).toHaveFocus();
  });

  it('Tab wraps from last to first', async () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[
          { label: 'Play to field', variant: 'primary', onClick: vi.fn() },
          { label: 'Cancel', variant: 'secondary', onClick: vi.fn() },
        ]}
        onClose={vi.fn()}
      />,
    );
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Play to field' })).toHaveFocus();
  });

  it('Tab from outside the dialog jumps back inside', async () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[
          { label: 'Play to field', variant: 'primary', onClick: vi.fn() },
          { label: 'Cancel', variant: 'secondary', onClick: vi.fn() },
        ]}
        onClose={vi.fn()}
      />,
    );
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.body).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Play to field' })).toHaveFocus();
  });

  it('Shift+Tab wraps from first to last', async () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[
          { label: 'Play to field', variant: 'primary', onClick: vi.fn() },
          { label: 'Cancel', variant: 'secondary', onClick: vi.fn() },
        ]}
        onClose={vi.fn()}
      />,
    );
    screen.getByRole('button', { name: 'Play to field' }).focus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('renders via portal', () => {
    const { container } = render(
      <div data-testid="parent-host">
        <CardInspector
          card={sampleCard}
          actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
          onClose={vi.fn()}
        />
      </div>,
    );
    const parent = container.querySelector('[data-testid="parent-host"]');
    expect(parent).not.toBeNull();
    expect(parent!.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
