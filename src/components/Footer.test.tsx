import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer } from './Footer';
import { I18nProvider } from '@/i18n/I18nProvider';

afterEach(() => cleanup());

function renderFooter(props: { source?: string | null } = {}) {
  return render(
    <I18nProvider>
      <Footer {...props} />
    </I18nProvider>,
  );
}

describe('Footer', () => {
  it('renders the disclaimer + Wizards fan policy link', () => {
    renderFooter();
    const link = screen.getByRole('link', { name: /(fan|policy|política|conteúdo)/i });
    expect(link.getAttribute('href')).toContain('company.wizards.com/en/legal/fancontentpolicy');
    // Cross-origin links must open in a new tab with rel=noreferrer.
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toMatch(/noreferrer/);
    expect(link.getAttribute('rel')).toMatch(/noopener/);
  });

  it('renders the deck source line when source is provided', () => {
    renderFooter({ source: 'scryfall' });
    expect(screen.getByText('scryfall')).toBeInTheDocument();
  });

  it('omits the deck source line when source is null/undefined', () => {
    renderFooter({ source: null });
    expect(screen.queryByText('scryfall')).toBeNull();
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('sets a regional lang attribute on the footer (pt-BR for the default)', () => {
    const { container } = renderFooter();
    const footer = container.querySelector('footer');
    expect(footer?.getAttribute('lang')).toBe('pt-BR');
  });
});
