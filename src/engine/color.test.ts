import { describe, it, expect } from 'vitest';
import { COLORS, COLOR_LABELS, pickOpponentColor } from './color';

describe('COLORS', () => {
  it('is the five MTG colors in canonical order', () => {
    expect(COLORS).toEqual(['W', 'U', 'B', 'R', 'G']);
  });
});

describe('COLOR_LABELS', () => {
  it('has a Portuguese name and a flavor line for every color', () => {
    for (const c of COLORS) {
      expect(COLOR_LABELS[c].name).toBeTruthy();
      expect(COLOR_LABELS[c].flavor).toBeTruthy();
    }
  });
});

describe('pickOpponentColor', () => {
  it('never returns the player color', () => {
    for (const c of COLORS) {
      for (let i = 0; i < 100; i++) {
        expect(pickOpponentColor(c)).not.toBe(c);
      }
    }
  });

  it('can return any of the four other colors', () => {
    const seen = new Set<string>();
    // deterministic rng sweep: 0, 0.25, 0.5, 0.75 map to each of the four others
    [0, 0.25, 0.5, 0.75].forEach((n) => {
      seen.add(pickOpponentColor('W', () => n));
    });
    expect(seen.size).toBe(4);
  });
});
