import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombatLayer } from './CombatLayer';
import { useCombatStore } from '@/store/useCombatStore';

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
});
