/**
 * Axe sweep over the key surfaces. Runs `vitest-axe` against each
 * component rendered in isolation. Catches regressions of concrete
 * WCAG failures (missing labels, bad contrast, duplicate ids, etc.)
 * — not a substitute for manual screen-reader review, but a CI gate
 * that fails on known-bad patterns.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('@/services/scryfall.client', () => ({
  fetchColorArt: vi.fn(() => new Promise(() => {})),
}));

import { ColorSelection } from '@/components/ColorSelection';
import { PlayerHeader } from '@/components/PlayerHeader';
import { ControlBar } from '@/components/ControlBar';
import { Battlefield } from '@/components/Battlefield';
import { Card } from '@/components/Card/Card';
import { Hand } from '@/components/Hand';
import type { ICard } from '@/engine/types';

const sampleCard: ICard = {
  id: 'a11y-c1',
  name: 'Test Goblin',
  power: 1, toughness: 1, cmc: 1,
  manaCost: '{R}',
  typeLine: 'Creature — Goblin',
  oracleText: 'Haste.',
  imageUrl: '',
  imageUrlSmall: '',
  accessibilityDescription: 'Test Goblin. Creature — Goblin. Mana cost red. Power 1, toughness 1. Haste.',
};

async function expectNoViolations(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

describe('a11y sweep', () => {
  it('ColorSelection has no axe violations', async () => {
    await expectNoViolations(<ColorSelection onSelect={() => {}} />);
  });

  it('PlayerHeader has no axe violations', async () => {
    await expectNoViolations(
      <PlayerHeader label="You" color="R" life={20} handCount={5} lifeAnchor="player-life" />,
    );
  });

  it('ControlBar has no axe violations (idle player turn)', async () => {
    await expectNoViolations(
      <ControlBar
        turn="player"
        winner={null}
        isAnimating={false}
        selectedAttacker={null}
        opponentCreatureCount={0}
        onAttackDirectly={() => {}}
        onEndTurn={() => {}}
      />,
    );
  });

  it('empty Battlefield has no axe violations', async () => {
    await expectNoViolations(
      <Battlefield label="Your battlefield" variant="player" cards={[]} />,
    );
  });

  it('populated Battlefield has no axe violations', async () => {
    await expectNoViolations(
      <Battlefield label="Your battlefield" variant="player" cards={[sampleCard]} />,
    );
  });

  it('Card has no axe violations', async () => {
    await expectNoViolations(<Card card={sampleCard} onActivate={() => {}} />);
  });

  it('hidden opponent Hand has no axe violations', async () => {
    const cards = [sampleCard, { ...sampleCard, id: 'a11y-c2' }];
    await expectNoViolations(
      <Hand hand={cards} label="Opponent hand" onActivate={() => {}} hidden compact />,
    );
  });
});
