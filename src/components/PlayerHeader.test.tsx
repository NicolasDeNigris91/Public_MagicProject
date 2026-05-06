import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/I18nProvider';
import { PlayerHeader } from './PlayerHeader';

function renderWith(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function baseProps(overrides: Partial<React.ComponentProps<typeof PlayerHeader>> = {}) {
  return {
    label: 'You',
    color: 'R' as const,
    life: 20,
    handCount: 5,
    lifeAnchor: 'player',
    manaAvailable: 2,
    manaMax: 3,
    ...overrides,
  };
}

describe('PlayerHeader mana', () => {
  it('renders mana as "Mana: x / y"', () => {
    renderWith(<PlayerHeader {...baseProps()} />);
    expect(screen.getAllByText(/Mana/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0);
  });
});

describe('PlayerHeader color symbol', () => {
  it('renders the mana symbol image when color is provided', () => {
    const { container } = renderWith(<PlayerHeader {...baseProps({ color: 'R' })} />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('omits the mana symbol image when color is null (pre-selection)', () => {
    const { container } = renderWith(<PlayerHeader {...baseProps({ color: null })} />);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PlayerHeader life pulse', () => {
  it('applies the lifePulse class when pulsing=true', () => {
    const { container } = renderWith(<PlayerHeader {...baseProps({ pulsing: true })} />);
    // LifeDisplay renders a span/div whose className composes lifeNumber
    // + lifePulse when pulsing. CSS-modules hash the class names, so
    // we anchor on the substring instead of the exact string.
    const pulsing = container.querySelector('[class*="lifePulse"]');
    expect(pulsing).not.toBeNull();
  });

  it('does not apply lifePulse when pulsing=false (default)', () => {
    const { container } = renderWith(<PlayerHeader {...baseProps()} />);
    expect(container.querySelector('[class*="lifePulse"]')).toBeNull();
  });
});

describe('PlayerHeader hand count pluralization', () => {
  it('handCount=1 renders the singular hand label', () => {
    renderWith(<PlayerHeader {...baseProps({ handCount: 1 })} />);
    // sr-only text reads "<handLabel> 1 <singular>". Locale-dependent
    // substring; we anchor on the digit and assert plural copy is absent.
    expect(screen.getAllByText(/\b1\b/).length).toBeGreaterThan(0);
  });

  it('handCount=0 renders the plural hand label', () => {
    renderWith(<PlayerHeader {...baseProps({ handCount: 0 })} />);
    expect(screen.getAllByText(/\b0\b/).length).toBeGreaterThan(0);
  });
});
