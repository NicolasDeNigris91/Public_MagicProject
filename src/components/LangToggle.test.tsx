import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LangToggle } from './LangToggle';
import { I18nProvider } from '@/i18n/I18nProvider';

beforeEach(() => {
  // Reset persisted lang so each test starts on the default (pt).
  try {
    window.localStorage.removeItem('mtg-a11y-lang');
  } catch {
    /* localStorage unavailable in some test envs — ignore. */
  }
  document.documentElement.lang = '';
});

afterEach(() => cleanup());

function renderWithProvider() {
  return render(
    <I18nProvider>
      <LangToggle />
    </I18nProvider>,
  );
}

describe('LangToggle', () => {
  it('renders both language buttons inside a labelled group', () => {
    renderWithProvider();
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toBeTruthy();
    // Two buttons, one per language.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('the active language button is aria-pressed=true on mount (pt is default)', () => {
    renderWithProvider();
    const buttons = screen.getAllByRole('button');
    const pressed = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
  });

  it('clicking the inactive button switches aria-pressed to it', async () => {
    renderWithProvider();
    const buttons = screen.getAllByRole('button');
    const inactive = buttons.find((b) => b.getAttribute('aria-pressed') === 'false')!;
    await userEvent.click(inactive);
    expect(inactive.getAttribute('aria-pressed')).toBe('true');
    // The previously-active button is now inactive.
    const stillPressed = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(stillPressed).toHaveLength(1);
    expect(stillPressed[0]).toBe(inactive);
  });

  it('switching language persists to localStorage and updates document.lang', async () => {
    renderWithProvider();
    const inactive = screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-pressed') === 'false')!;
    await userEvent.click(inactive);
    const stored = window.localStorage.getItem('mtg-a11y-lang');
    expect(stored).toMatch(/^(pt|en)$/);
    expect(document.documentElement.lang).toBe(stored);
  });
});
