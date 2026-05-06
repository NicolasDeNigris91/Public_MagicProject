import { describe, it, expect } from 'vitest';
import {
  COLORS,
  COLOR_LABELS,
  MANA_SYMBOL_URL,
  pickOpponentColor,
  buildDeckFromCandidates,
  SKELETON,
} from './color';
import { cardId } from './types';
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

describe('MANA_SYMBOL_URL', () => {
  // The five basic mana SVGs are pinned to Scryfall's static CDN. Any
  // accidental rename of W/U/B/R/G in the constant breaks rendering;
  // assert each exact URL so a literal mutation is caught.
  it('maps each color to its canonical Scryfall card-symbol SVG', () => {
    expect(MANA_SYMBOL_URL.W).toBe('https://svgs.scryfall.io/card-symbols/W.svg');
    expect(MANA_SYMBOL_URL.U).toBe('https://svgs.scryfall.io/card-symbols/U.svg');
    expect(MANA_SYMBOL_URL.B).toBe('https://svgs.scryfall.io/card-symbols/B.svg');
    expect(MANA_SYMBOL_URL.R).toBe('https://svgs.scryfall.io/card-symbols/R.svg');
    expect(MANA_SYMBOL_URL.G).toBe('https://svgs.scryfall.io/card-symbols/G.svg');
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

function card(
  partial: Omit<Partial<ICard>, 'id'> & {
    id: string;
    cmc: number;
    power: number;
    toughness: number;
  },
): ICard {
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
    id: cardId(partial.id),
  };
}

function makeSeeds(): ICard[] {
  // 20 seeds, one per skeleton slot. The curve template is repeated
  // twice (same shape); seeds 10-19 mirror seeds 0-9 with `-b` ids
  // so every slot has a fitting fallback with a unique id.
  const base = [
    { id: 'seed-0', cmc: 1, power: 1, toughness: 1 },
    { id: 'seed-1', cmc: 1, power: 2, toughness: 1 },
    { id: 'seed-2', cmc: 2, power: 2, toughness: 2 },
    { id: 'seed-3', cmc: 2, power: 2, toughness: 3 },
    { id: 'seed-4', cmc: 3, power: 2, toughness: 3 },
    { id: 'seed-5', cmc: 3, power: 3, toughness: 2 },
    { id: 'seed-6', cmc: 4, power: 3, toughness: 4 },
    { id: 'seed-7', cmc: 5, power: 4, toughness: 4 },
    { id: 'seed-8', cmc: 6, power: 5, toughness: 5 },
    { id: 'seed-9', cmc: 2, power: 1, toughness: 2 },
  ];
  return [...base.map(card), ...base.map((b) => card({ ...b, id: `${b.id}-b` }))];
}

describe('buildDeckFromCandidates', () => {
  it('returns exactly SKELETON.length cards', () => {
    const deck = buildDeckFromCandidates([], makeSeeds());
    expect(deck).toHaveLength(SKELETON.length);
  });

  it('uses candidates over seeds when a candidate fits the slot', () => {
    const candidate = card({ id: 'cand', cmc: 1, power: 2, toughness: 2 });
    const deck = buildDeckFromCandidates([candidate], makeSeeds());
    // slot 0: 1-drop power 1-2 toughness 1-2 - candidate fits.
    expect(deck[0]!.id).toBe('cand');
    // later slots fall back to seeds.
    expect(deck[9]!.id).toBe('seed-9');
  });

  it('never reuses the same candidate for two slots', () => {
    const candidate = card({ id: 'cand', cmc: 1, power: 2, toughness: 2 });
    const deck = buildDeckFromCandidates([candidate, candidate], makeSeeds());
    const candCount = deck.filter((c) => c.id === 'cand').length;
    expect(candCount).toBeLessThanOrEqual(1);
  });

  it('falls back to the per-slot seed when no candidate fits', () => {
    const offCurve = card({ id: 'off', cmc: 8, power: 9, toughness: 9 });
    const seeds = makeSeeds();
    const deck = buildDeckFromCandidates([offCurve], seeds);
    // off-curve candidate fits no slot → deck equals the seeds in order.
    expect(deck.map((c) => c.id)).toEqual(seeds.map((c) => c.id));
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
    expect(deck[9]!.id).toBe('flex');
  });

  it('flex slot accepts the lower cmc bound (cmc=1)', () => {
    // Slot 9 accepts cmc 1-3. A candidate at cmc=1 must fit; the
    // boundary kills the `>= → >` mutation on the lower edge.
    const seeds = makeSeeds();
    const deck = buildDeckFromCandidates(
      [
        // Fill slots 0+1 so the cmc-1 candidate has nowhere to go but flex.
        card({ id: 'fill0', cmc: 1, power: 1, toughness: 1 }),
        card({ id: 'fill1', cmc: 1, power: 1, toughness: 1 }),
        card({ id: 'lo-bound', cmc: 1, power: 2, toughness: 4 }),
      ],
      seeds,
    );
    expect(deck[9]!.id).toBe('lo-bound');
  });

  it('flex slot accepts the upper cmc bound (cmc=3) and rejects cmc=4', () => {
    const seeds = makeSeeds();

    // cmc=3 inside the [1,3] window — must take the flex slot.
    const acceptedDeck = buildDeckFromCandidates(
      [card({ id: 'hi-bound', cmc: 3, power: 2, toughness: 4 })],
      seeds,
    );
    // cmc=3 power=2 toughness=4 also fits slots 4 and 5 (cmc 3, pow 2-3,
    // tou 2-3) — wait, toughness=4 is out of range for slots 4/5 (tou 2-3),
    // so it ends up in the flex slot 9.
    expect(acceptedDeck[9]!.id).toBe('hi-bound');

    // cmc=4 outside the [1,3] window — flex slot must fall back to seed-9.
    const rejectedDeck = buildDeckFromCandidates(
      [card({ id: 'over-bound', cmc: 4, power: 2, toughness: 4 })],
      seeds,
    );
    expect(rejectedDeck[9]!.id).toBe('seed-9');
  });

  it('inRange rejects power below the slot lower bound', () => {
    // Slot 0 wants power 1-2. A cmc-1 candidate at power=0 must be
    // rejected, and the slot falls back to its seed.
    const seeds = makeSeeds();
    const deck = buildDeckFromCandidates(
      [card({ id: 'underpowered', cmc: 1, power: 0, toughness: 1 })],
      seeds,
    );
    expect(deck[0]!.id).toBe('seed-0');
  });

  it('inRange rejects toughness above the slot upper bound', () => {
    // Slot 0 wants toughness 1-2. A candidate at toughness=3 falls back
    // to seed (kills the inRange `<=` upper-edge mutation to `<`).
    const seeds = makeSeeds();
    const deck = buildDeckFromCandidates(
      [card({ id: 'too-tough', cmc: 1, power: 1, toughness: 3 })],
      seeds,
    );
    expect(deck[0]!.id).toBe('seed-0');
  });

  it('cmcMatches rejects a fixed-cmc candidate whose cmc does not equal the slot value', () => {
    // Slot 0 wants cmc===1. A candidate at cmc=99 with otherwise
    // perfect power/toughness must still be rejected — kills the
    // mutation that turns `cardCmc === slotCmc` into `true`.
    const seeds = makeSeeds();
    const deck = buildDeckFromCandidates(
      [card({ id: 'wrong-cmc', cmc: 99, power: 1, toughness: 1 })],
      seeds,
    );
    expect(deck[0]!.id).toBe('seed-0');
  });

  it('cmcMatches rejects a flex-slot candidate below the lower cmc bound', () => {
    // Flex slot 9 accepts cmc 1-3. A cmc=0 candidate must be
    // rejected — kills the mutation that turns `cardCmc >= slotCmc[0]`
    // into `true`. Power/toughness chosen to fit the slot otherwise
    // so cmc is the sole rejection reason.
    const seeds = makeSeeds();
    const deck = buildDeckFromCandidates(
      [
        // Fill slots 0+1 so the under-cmc candidate has nowhere to
        // go but flex (which then rejects it on the cmc lower bound).
        card({ id: 'fill0', cmc: 1, power: 1, toughness: 1 }),
        card({ id: 'fill1', cmc: 1, power: 1, toughness: 1 }),
        card({ id: 'under-bound', cmc: 0, power: 1, toughness: 2 }),
      ],
      seeds,
    );
    expect(deck[9]!.id).toBe('seed-9');
  });
});
