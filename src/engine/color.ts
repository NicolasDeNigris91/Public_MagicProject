/**
 * Color pie, deck skeleton, and balancing algorithm.
 *
 * Kept in `engine/` because it is pure and framework-agnostic: no
 * React, no fetch, no Zustand. The skeleton is the contract the two
 * decks share, and buildDeckFromCandidates is the function that
 * turns any pool of color-filtered cards into a deck that satisfies
 * that contract.
 */

export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export const COLORS: readonly Color[] = ['W', 'U', 'B', 'R', 'G'] as const;

export const COLOR_LABELS: Record<Color, { name: string; flavor: string }> = {
  W: { name: 'Branco',   flavor: 'criaturas pequenas e keywords defensivas' },
  U: { name: 'Azul',     flavor: 'criaturas voadoras e evasivas' },
  B: { name: 'Preto',    flavor: 'criaturas letais e resilientes' },
  R: { name: 'Vermelho', flavor: 'criaturas rápidas e agressivas' },
  G: { name: 'Verde',    flavor: 'criaturas grandes e robustas' },
};

export interface SkeletonSlot {
  /** Fixed integer CMC, or inclusive [min, max] for flex slots. */
  cmc: number | readonly [number, number];
  /** Inclusive [min, max] power range. */
  power: readonly [number, number];
  /** Inclusive [min, max] toughness range. */
  toughness: readonly [number, number];
}

/** Ten slots per deck. Both sides fill the same skeleton, so power
 *  budget and curve are identical — only the color pie differs. */
export const SKELETON: readonly SkeletonSlot[] = [
  { cmc: 1, power: [1, 2], toughness: [1, 2] },
  { cmc: 1, power: [1, 2], toughness: [1, 2] },
  { cmc: 2, power: [2, 2], toughness: [1, 3] },
  { cmc: 2, power: [2, 2], toughness: [1, 3] },
  { cmc: 3, power: [2, 3], toughness: [2, 3] },
  { cmc: 3, power: [2, 3], toughness: [2, 3] },
  { cmc: 4, power: [3, 4], toughness: [3, 4] },
  { cmc: 5, power: [4, 4], toughness: [4, 4] },
  { cmc: 6, power: [5, 5], toughness: [5, 5] },
  { cmc: [1, 3], power: [1, 2], toughness: [1, 4] },
] as const;

export function pickOpponentColor(
  playerColor: Color,
  rng: () => number = Math.random,
): Color {
  const others = COLORS.filter((c) => c !== playerColor);
  return others[Math.floor(rng() * others.length)];
}
