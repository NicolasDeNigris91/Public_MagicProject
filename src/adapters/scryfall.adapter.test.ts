import { describe, it, expect } from 'vitest';
import { adaptScryfallCard, type ScryfallCard } from './scryfall.adapter';

function raw(partial: Partial<ScryfallCard>): ScryfallCard {
  return {
    id: 'x', name: 'X', type_line: 'Creature',
    ...partial,
  };
}

describe('adaptScryfallCard colors + cmc', () => {
  it('sets color from a mono-color scryfall card', () => {
    const out = adaptScryfallCard(raw({ colors: ['R'], cmc: 3 }));
    expect(out.color).toBe('R');
    expect(out.cmc).toBe(3);
  });

  it('leaves color undefined on multicolor cards', () => {
    const out = adaptScryfallCard(raw({ colors: ['W', 'U'], cmc: 2 }));
    expect(out.color).toBeUndefined();
  });

  it('leaves color undefined on colorless cards', () => {
    const out = adaptScryfallCard(raw({ colors: [], cmc: 4 }));
    expect(out.color).toBeUndefined();
  });

  it('defaults cmc to 0 when missing', () => {
    const out = adaptScryfallCard(raw({ colors: ['G'] }));
    expect(out.cmc).toBe(0);
  });
});
