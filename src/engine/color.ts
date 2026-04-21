/**
 * Color pie, deck skeleton, and balancing algorithm.
 *
 * Kept in `engine/` because it is pure and framework-agnostic: no
 * React, no fetch, no Zustand. The skeleton is the contract the two
 * decks share, and buildDeckFromCandidates is the function that
 * turns any pool of color-filtered cards into a deck that satisfies
 * that contract.
 */

import type { ICard } from './types';

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

function cmcMatches(slotCmc: SkeletonSlot['cmc'], cardCmc: number): boolean {
  if (typeof slotCmc === 'number') return cardCmc === slotCmc;
  return cardCmc >= slotCmc[0] && cardCmc <= slotCmc[1];
}

function inRange(r: readonly [number, number], n: number): boolean {
  return n >= r[0] && n <= r[1];
}

function fits(slot: SkeletonSlot, c: ICard): boolean {
  return (
    cmcMatches(slot.cmc, c.cmc) &&
    inRange(slot.power, c.power) &&
    inRange(slot.toughness, c.toughness)
  );
}

/**
 * Greedy best-fit: walk skeleton slots in order, pick the first
 * unused candidate that fits the slot. If no candidate fits, use
 * the per-slot seed.
 *
 * Candidates are consumed; seeds are indexed by slot position.
 * Caller is responsible for ensuring `fallbackSeeds.length ===
 * SKELETON.length` and that each seed fits its corresponding slot.
 */
export function buildDeckFromCandidates(
  candidates: readonly ICard[],
  fallbackSeeds: readonly ICard[],
): ICard[] {
  const used = new Set<string>();
  const deck: ICard[] = [];
  for (let i = 0; i < SKELETON.length; i++) {
    const slot = SKELETON[i];
    const picked = candidates.find((c) => !used.has(c.id) && fits(slot, c));
    if (picked) {
      used.add(picked.id);
      deck.push(picked);
    } else {
      deck.push(fallbackSeeds[i]);
    }
  }
  return deck;
}
