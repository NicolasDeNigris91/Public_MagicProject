// Builds the prose description used as the canonical aria-label.
// Example: "Shivan Dragon. Creature - Dragon. Mana cost 4 generic plus
// 2 red. Power 5, toughness 5. Flying. {R}: gets +1/+0 until end of turn."
import type { ICard } from '@/engine/types';

export interface RawCardFields {
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  power: number;
  toughness: number;
}

const MANA_SYMBOLS: Record<string, string> = {
  W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green',
  C: 'colorless', X: 'variable', S: 'snow',
};

function humanizeManaCost(cost: string): string {
  if (!cost) return 'no mana cost';
  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  if (symbols.length === 0) return 'no mana cost';
  const parts: string[] = [];
  let generic = 0;
  for (const sym of symbols) {
    const inner = sym.slice(1, -1);
    const asNum = parseInt(inner, 10);
    if (!Number.isNaN(asNum)) { generic += asNum; continue; }
    parts.push(MANA_SYMBOLS[inner] ?? inner.toLowerCase());
  }
  if (generic > 0) parts.unshift(`${generic} generic`);
  return `mana cost ${parts.join(' plus ')}`;
}

function isCreature(typeLine: string): boolean {
  return /creature/i.test(typeLine);
}

export function buildA11yDescription(raw: RawCardFields): string {
  const parts: string[] = [raw.name + '.'];
  if (raw.typeLine) parts.push(raw.typeLine + '.');
  parts.push(capitalize(humanizeManaCost(raw.manaCost)) + '.');
  if (isCreature(raw.typeLine)) {
    parts.push(`Power ${raw.power}, toughness ${raw.toughness}.`);
  }
  if (raw.oracleText) {
    parts.push(raw.oracleText.replace(/\n+/g, ' '));
  }
  return parts.join(' ');
}

export function shortCardLabel(card: Pick<ICard, 'name' | 'power' | 'toughness' | 'typeLine'>): string {
  if (isCreature(card.typeLine)) {
    return `${card.name}, ${card.power} over ${card.toughness}`;
  }
  return card.name;
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}
