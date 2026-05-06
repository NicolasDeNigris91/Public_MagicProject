import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card';
import { cardId } from '@/engine/types';
import type { ICard } from '@/engine/types';

const sample: ICard = {
  id: cardId('c1'),
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

const cardButton = () => screen.getByRole('button', { name: /^Test Goblin\./ });

describe('Card - onInspect', () => {
  it('pressing "i" with focus invokes onInspect (not onActivate)', async () => {
    const onActivate = vi.fn();
    const onInspect = vi.fn();
    render(<Card card={sample} onActivate={onActivate} onInspect={onInspect} />);
    // Anchor: the outer card button's accessible name starts with "Test Goblin."
    // (the card.accessibilityDescription); the inspect span's aria-label is
    // "Inspect Test Goblin" - different leading character.
    cardButton().focus();
    await userEvent.keyboard('i');
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('renders a hidden-by-default "ⓘ" inspect button when onInspect is provided', () => {
    render(<Card card={sample} onActivate={vi.fn()} onInspect={vi.fn()} />);
    const inspectBtn = screen.getByRole('button', { name: /inspe(cionar|ct)/i });
    expect(inspectBtn).toBeInTheDocument();
  });

  it('does NOT render the "ⓘ" button when onInspect is omitted', () => {
    render(<Card card={sample} onActivate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /inspe(cionar|ct)/i })).toBeNull();
  });

  it('clicking the "ⓘ" button calls onInspect (not onActivate)', async () => {
    const onActivate = vi.fn();
    const onInspect = vi.fn();
    render(<Card card={sample} onActivate={onActivate} onInspect={onInspect} />);
    await userEvent.click(screen.getByRole('button', { name: /inspe(cionar|ct)/i }));
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('Card - activation', () => {
  it('clicking the card body invokes onActivate', async () => {
    const onActivate = vi.fn();
    render(<Card card={sample} onActivate={onActivate} />);
    await userEvent.click(cardButton());
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0]?.[0]).toBe(sample);
  });

  it('Enter key invokes onActivate (not onInspect)', async () => {
    const onActivate = vi.fn();
    const onInspect = vi.fn();
    render(<Card card={sample} onActivate={onActivate} onInspect={onInspect} />);
    cardButton().focus();
    await userEvent.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('Space key invokes onActivate', async () => {
    const onActivate = vi.fn();
    render(<Card card={sample} onActivate={onActivate} />);
    cardButton().focus();
    await userEvent.keyboard(' ');
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('uppercase "I" with focus also invokes onInspect', async () => {
    const onInspect = vi.fn();
    render(<Card card={sample} onActivate={vi.fn()} onInspect={onInspect} />);
    cardButton().focus();
    await userEvent.keyboard('I');
    expect(onInspect).toHaveBeenCalledTimes(1);
  });

  it('selected=true sets aria-pressed="true"', () => {
    render(<Card card={sample} selected onActivate={vi.fn()} />);
    expect(cardButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('aria-keyshortcuts="I" only when onInspect is provided', () => {
    const { rerender } = render(<Card card={sample} onActivate={vi.fn()} />);
    expect(cardButton()).not.toHaveAttribute('aria-keyshortcuts');
    rerender(<Card card={sample} onActivate={vi.fn()} onInspect={vi.fn()} />);
    expect(cardButton()).toHaveAttribute('aria-keyshortcuts', 'I');
  });
});

// Badges are <span aria-hidden="true">; the CardFallback wrapper is a
// <div aria-hidden="true">. Counting span-only filters to badges.
const badgeCount = (btn: HTMLElement) => btn.querySelectorAll('span[aria-hidden="true"]').length;

describe('Card - status badges', () => {
  it('summoning sickness renders the sick badge and appends the sick aria suffix', () => {
    const sick: ICard = { ...sample, summoningSick: true };
    render(<Card card={sick} onActivate={vi.fn()} />);
    const btn = cardButton();
    expect(btn.getAttribute('aria-label')).toMatch(/(sickness|invocação)/i);
    expect(badgeCount(btn)).toBe(1);
  });

  it('attackedThisTurn (without summoningSick) renders the exhausted badge', () => {
    const tired: ICard = { ...sample, attackedThisTurn: true };
    render(<Card card={tired} onActivate={vi.fn()} />);
    const btn = cardButton();
    expect(btn.getAttribute('aria-label')).toMatch(/(already attacked|já atacou)/i);
    expect(badgeCount(btn)).toBe(1);
  });

  it('summoningSick takes precedence when both flags are set', () => {
    const both: ICard = { ...sample, summoningSick: true, attackedThisTurn: true };
    render(<Card card={both} onActivate={vi.fn()} />);
    const btn = cardButton();
    // sick suffix wins, NOT the "already attacked" suffix.
    expect(btn.getAttribute('aria-label')).toMatch(/(sickness|invocação)/i);
    expect(btn.getAttribute('aria-label')).not.toMatch(/(already attacked|já atacou)/i);
    expect(badgeCount(btn)).toBe(1);
  });

  it('default (no flags) renders no badge and the bare accessibilityDescription', () => {
    render(<Card card={sample} onActivate={vi.fn()} />);
    const btn = cardButton();
    expect(btn.getAttribute('aria-label')).toBe(sample.accessibilityDescription);
    expect(badgeCount(btn)).toBe(0);
  });
});

describe('Card - combat animations', () => {
  // The Card component subscribes to useCombatStore. Unmounting the
  // tree before resetting state keeps the post-test setState off the
  // mounted subscriber so React doesn't warn about updates outside act.
  it('isImpacting (impactIds contains card.id) applies the combat-shake style', async () => {
    const { useCombatStore } = await import('@/store/useCombatStore');
    useCombatStore.setState({ impactIds: [sample.id] });
    const { unmount } = render(<Card card={sample} onActivate={vi.fn()} />);
    expect(cardButton().getAttribute('style') ?? '').toMatch(/combat-shake/);
    unmount();
    useCombatStore.setState({ impactIds: [] });
  });

  it('isDying (deathIds contains card.id) overrides isImpacting with combat-tilt-fade', async () => {
    const { useCombatStore } = await import('@/store/useCombatStore');
    useCombatStore.setState({ impactIds: [sample.id], deathIds: [sample.id] });
    const { unmount } = render(<Card card={sample} onActivate={vi.fn()} />);
    const style = cardButton().getAttribute('style') ?? '';
    expect(style).toMatch(/combat-tilt-fade/);
    expect(style).not.toMatch(/combat-shake/);
    unmount();
    useCombatStore.setState({ impactIds: [], deathIds: [] });
  });
});

describe('Card - image fallback', () => {
  it('with imageUrl present, renders an <img>; on error, swaps to CardFallback', () => {
    const withImg: ICard = { ...sample, imageUrl: 'https://example.test/c1.png' };
    const { container } = render(<Card card={withImg} onActivate={vi.fn()} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.test/c1.png');
    // Force the error branch: setImgFailed(true) flips the conditional and
    // CardFallback takes over. The <img> unmounts.
    fireEvent.error(img!);
    expect(container.querySelector('img')).toBeNull();
  });
});
