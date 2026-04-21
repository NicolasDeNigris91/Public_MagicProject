import { describe, it, expect } from 'vitest';
import { COLORS, SKELETON, buildDeckFromCandidates } from '@/engine/color';
import { fallbackDecks } from './fallback-deck';

describe('fallbackDecks', () => {
  it('has ten seeds per color, each tagged with its color', () => {
    for (const color of COLORS) {
      const seeds = fallbackDecks[color];
      expect(seeds).toHaveLength(SKELETON.length);
      seeds.forEach((c) => expect(c.color).toBe(color));
    }
  });

  it('each color fills the skeleton with no gaps using its own seeds', () => {
    for (const color of COLORS) {
      const seeds = fallbackDecks[color];
      // Feeding the seeds themselves as both candidates and fallbacks
      // must yield a deck equal to the seeds, proving each seed fits
      // its intended slot.
      const built = buildDeckFromCandidates(seeds, seeds);
      expect(built.map((c) => c.id)).toEqual(seeds.map((c) => c.id));
    }
  });
});
