import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LifeDisplay } from './LifeDisplay';

describe('LifeDisplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the current value on mount without animating', () => {
    render(<LifeDisplay value={20} />);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('animates from previous to new value over ~400ms when value decreases', async () => {
    const { rerender } = render(<LifeDisplay value={20} />);
    rerender(<LifeDisplay value={17} />);
    // Halfway through the 400ms lerp we should see an intermediate integer.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    const shown = Number(screen.getByRole('status').textContent);
    expect(shown).toBeGreaterThan(17);
    expect(shown).toBeLessThan(20);
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('snaps to new value when prefers-reduced-motion matches', () => {
    // jsdom: matchMedia returns matches=false by default; simulate reduced-motion.
    const mql = { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
    vi.stubGlobal('matchMedia', () => mql);
    const { rerender } = render(<LifeDisplay value={20} />);
    rerender(<LifeDisplay value={17} />);
    expect(screen.getByText('17')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
