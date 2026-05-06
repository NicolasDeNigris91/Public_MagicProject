import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { GameSkeleton } from './GameSkeleton';
import { I18nProvider } from '@/i18n/I18nProvider';

afterEach(() => cleanup());

describe('GameSkeleton', () => {
  it('marks the main element busy with a localized loading announcement', () => {
    render(
      <I18nProvider>
        <GameSkeleton />
      </I18nProvider>,
    );
    const main = screen.getByRole('main');
    expect(main.getAttribute('aria-busy')).toBe('true');
    expect(main.getAttribute('aria-live')).toBe('polite');
    // sr-only loading copy lives inside the main; assert it's non-empty.
    const loadingText = main.querySelector('.sr-only');
    expect(loadingText?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it('forwards a ref to the underlying <main> so the page can move focus to it', () => {
    const ref = createRef<HTMLElement>();
    render(
      <I18nProvider>
        <GameSkeleton ref={ref} />
      </I18nProvider>,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('MAIN');
    expect(ref.current?.tabIndex).toBe(-1);
  });

  it('all visual placeholders are aria-hidden so AT only sees the loading announcement', () => {
    const { container } = render(
      <I18nProvider>
        <GameSkeleton />
      </I18nProvider>,
    );
    // 5 opponent placeholders + 5 player placeholders + header row + battlefields:
    // any block-level placeholder must be hidden from AT, since the busy main
    // already announces the state.
    const placeholders = container.querySelectorAll('[aria-hidden="true"]');
    expect(placeholders.length).toBeGreaterThanOrEqual(4);
  });
});
