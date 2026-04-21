import { describe, it, expect } from 'vitest';
import { COLORS, COLOR_LABELS, pickOpponentColor, buildDeckFromCandidates, SKELETON } from './color';
import type { ICard } from './types';

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

function card(partial: Partial<ICard> & { id: string; cmc: number; power: number; toughness: number }): ICard {
  return {
    name: partial.id,
    color: 'R',
    manaCost: '',
    typeLine: 'Creature',
    oracleText: '',
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: '',
    ...partial,
  };
}

function makeSeeds(): ICard[] {
  // 10 seeds, one per skeleton slot, each sitting cleanly inside its window.
  return [
    card({ id: 'seed-0', cmc: 1, power: 1, toughness: 1 }),
    card({ id: 'seed-1', cmc: 1, power: 2, toughness: 1 }),
    card({ id: 'seed-2', cmc: 2, power: 2, toughness: 2 }),
    card({ id: 'seed-3', cmc: 2, power: 2, toughness: 3 }),
    card({ id: 'seed-4', cmc: 3, power: 2, toughness: 3 }),
    card({ id: 'seed-5', cmc: 3, power: 3, toughness: 2 }),
    card({ id: 'seed-6', cmc: 4, power: 3, toughness: 4 }),
    card({ id: 'seed-7', cmc: 5, power: 4, toughness: 4 }),
    card({ id: 'seed-8', cmc: 6, power: 5, toughness: 5 }),
    card({ id: 'seed-9', cmc: 2, power: 1, toughness: 2 }),
  ];
}

describe('buildDeckFromCandidates', () => {
  it('returns exactly SKELETON.length cards', () => {
    const deck = buildDeckFromCandidates([], makeSeeds());
    expect(deck).toHaveLength(SKELETON.length);
  });

  it('uses candidates over seeds when a candidate fits the slot', () => {
    const candidate = card({ id: 'cand', cmc: 1, power: 2, toughness: 2 });
    const deck = buildDeckFromCandidates([candidate], makeSeeds());
    // slot 0: 1-drop power 1-2 toughness 1-2 — candidate fits.
    expect(deck[0].id).toBe('cand');
    // later slots fall back to seeds.
    expect(deck[9].id).toBe('seed-9');
  });

  it('never reuses the same candidate for two slots', () => {
    const candidate = card({ id: 'cand', cmc: 1, power: 2, toughness: 2 });
    const deck = buildDeckFromCandidates([candidate, candidate], makeSeeds());
    const candCount = deck.filter((c) => c.id === 'cand').length;
    expect(candCount).toBeLessThanOrEqual(1);
  });

  it('falls back to the per-slot seed when no candidate fits', () => {
    const offCurve = card({ id: 'off', cmc: 8, power: 9, toughness: 9 });
    const deck = buildDeckFromCandidates([offCurve], makeSeeds());
    // off-curve candidate fits no slot → all slots come from seeds.
    deck.forEach((c, i) => expect(c.id).toBe(`seed-${i}`));
  });

  it('places a cmc-2 candidate into the flex slot (slot 9) when earlier slots are already filled', () => {
    // Flex slot accepts cmc 1-3, pow 1-2, tou 1-4.
    const flexCand = card({ id: 'flex', cmc: 2, power: 1, toughness: 3 });
    const deck = buildDeckFromCandidates(
      [
        // Fill slots 0 and 1 so flex must go to slot 9.
        card({ id: 'A', cmc: 1, power: 1, toughness: 1 }),
        card({ id: 'B', cmc: 1, power: 1, toughness: 1 }),
        flexCand,
      ],
      makeSeeds(),
    );
    expect(deck[9].id).toBe('flex');
  });
});
