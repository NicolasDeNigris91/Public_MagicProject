import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerHeader } from './PlayerHeader';
import { I18nProvider } from '@/i18n/I18nProvider';

function renderWith(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('PlayerHeader mana', () => {
  it('renders mana as "Mana: x / y"', () => {
    renderWith(
      <PlayerHeader
        label="You"
        color="R"
        life={20}
        handCount={5}
        lifeAnchor="player"
        manaAvailable={2}
        manaMax={3}
      />,
    );
    expect(screen.getAllByText(/Mana/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0);
  });
});
