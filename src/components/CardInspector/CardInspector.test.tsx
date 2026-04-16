import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CardInspector } from './CardInspector';
import type { ICard } from '@/engine/types';

const sampleCard: ICard = {
  id: 'card-1',
  name: 'Shivan Dragon',
  power: 5,
  toughness: 5,
  manaCost: '{4}{R}{R}',
  typeLine: 'Creature — Dragon',
  oracleText: 'Flying. {R}: Shivan Dragon gets +1/+0 until end of turn.',
  imageUrl: 'https://cards.scryfall.io/normal/shivan.jpg',
  imageUrlSmall: 'https://cards.scryfall.io/small/shivan.jpg',
  accessibilityDescription:
    'Shivan Dragon. Creature — Dragon. Mana cost 4 generic plus 2 red. Power 5, toughness 5. Flying. Red mana: Shivan Dragon gets +1/+0 until end of turn.',
};

describe('CardInspector', () => {
  it('renders the card name as the dialog title', () => {
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

  it('renders the type line, humanized mana cost, and power/toughness', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Creature — Dragon')).toBeInTheDocument();
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

  it('uses the card accessibilityDescription as the dialog aria-label', () => {
    render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', sampleCard.accessibilityDescription);
  });

  it('renders one button per action with the correct labels', () => {
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

  it('renders CardFallback when card.imageUrl is empty', () => {
    render(
      <CardInspector
        card={{ ...sampleCard, imageUrl: '' }}
        actions={[{ label: 'Close', variant: 'primary', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />,
    );
    // The CardFallback rerenders the card name visibly.
    const headings = screen.getAllByText('Shivan Dragon');
    // Title (h2) + fallback name -> at least 2.
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('swaps to CardFallback when the image fires onError', () => {
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
    // After error, fallback renders the card name a second time.
    const headings = screen.getAllByText('Shivan Dragon');
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('invokes onClose when Escape is pressed', async () => {
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

  it('invokes onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <CardInspector
        card={sampleCard}
        actions={[{ label: 'Close', variant: 'primary', onClick: onClose }]}
        onClose={onClose}
      />,
    );
    const backdrop = container.firstElementChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT invoke onClose when the dialog interior is clicked', async () => {
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

  it('puts initial focus on the first (primary) action button', () => {
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

  it('Tab from the last focusable wraps to the first', async () => {
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

  it('redirects Tab to the first focusable when focus is outside the dialog', async () => {
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
    // Move focus to body (simulates focus loss to a backdrop click or DOM mutation).
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.body).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Play to field' })).toHaveFocus();
  });

  it('Shift+Tab from the first focusable wraps to the last', async () => {
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
});
