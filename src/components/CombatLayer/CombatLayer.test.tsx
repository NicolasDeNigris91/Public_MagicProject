import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCombatStore } from '@/store/useCombatStore';
import { CombatLayer } from './CombatLayer';

describe('CombatLayer', () => {
  beforeEach(() => useCombatStore.getState().reset());

  it('renders nothing when animator idle', () => {
    const { container } = render(<CombatLayer />);
    // Portal renders into document.body; query document for the aria-hidden
    // overlay wrapper.
    expect(document.querySelector('[data-combat-layer]')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders damage numbers when state contains them', () => {
    const anchor = document.createElement('div');
    anchor.setAttribute('data-card-id', 'unit-1');
    anchor.textContent = 'Anchor';
    document.body.appendChild(anchor);

    useCombatStore.setState({
      damageNumbers: [{ id: 'x', anchorId: 'unit-1', value: 3 }],
      flight: { attackerId: 'a1', targetId: 'unit-1', targetKind: 'creature' },
    });
    render(<CombatLayer />);

    const overlay = document.querySelector('[data-combat-layer]');
    expect(overlay).not.toBeNull();
    const damage = screen.getByText('-3');
    expect(damage).toBeInTheDocument();
    expect(overlay).toContainElement(damage);

    anchor.remove();
  });

  it('renders a flight clone while flight is active', () => {
    // Seed a fake card anchor in the DOM so getBoundingClientRect works.
    const anchor = document.createElement('div');
    anchor.setAttribute('data-card-id', 'att-1');
    anchor.textContent = 'Goblin';
    document.body.appendChild(anchor);
    const target = document.createElement('div');
    target.setAttribute('data-card-id', 'def-1');
    document.body.appendChild(target);

    useCombatStore.setState({
      flight: { attackerId: 'att-1', targetId: 'def-1', targetKind: 'creature' },
    });
    render(<CombatLayer />);
    expect(document.querySelector('[data-combat-clone]')).not.toBeNull();

    anchor.remove();
    target.remove();
  });
});
