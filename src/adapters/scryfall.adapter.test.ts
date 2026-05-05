import { describe, it, expect } from 'vitest';
import {
  adaptScryfallCard,
  parseScryfallCards,
  ScryfallCardSchema,
  ScryfallSearchResponseSchema,
  type ScryfallCard,
} from './scryfall.adapter';

function raw(partial: Partial<ScryfallCard>): ScryfallCard {
  return {
    id: 'x',
    name: 'X',
    type_line: 'Creature',
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

describe('zod schemas at the scryfall boundary', () => {
  it('parses a minimal valid card', () => {
    const ok = ScryfallCardSchema.safeParse({
      id: 'a',
      name: 'A',
      type_line: 'Creature',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a card missing id', () => {
    const bad = ScryfallCardSchema.safeParse({
      name: 'A',
      type_line: 'Creature',
    });
    expect(bad.success).toBe(false);
  });

  it('rejects a card with non-string name (drift simulation)', () => {
    const bad = ScryfallCardSchema.safeParse({
      id: 'a',
      name: 42,
      type_line: 'Creature',
    });
    expect(bad.success).toBe(false);
  });

  it('parseScryfallCards drops invalid entries individually', () => {
    const valid = parseScryfallCards([
      { id: 'a', name: 'A', type_line: 'Creature' },
      { id: 'b' },
      { id: 'c', name: 'C', type_line: 'Creature', cmc: 'four' },
      { id: 'd', name: 'D', type_line: 'Creature' },
    ]);
    expect(valid.map((c) => c.id)).toEqual(['a', 'd']);
  });

  it('search-response envelope tolerates missing data field', () => {
    const ok = ScryfallSearchResponseSchema.safeParse({});
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.data).toEqual([]);
  });

  it('search-response envelope rejects non-array data', () => {
    const bad = ScryfallSearchResponseSchema.safeParse({ data: 'oops' });
    expect(bad.success).toBe(false);
  });
});
