/**
 * Boundary between Scryfall's data shape and our engine's ICard.
 * The engine MUST NOT import anything from Scryfall - swapping card
 * data source (Lorcana, Pokemon TCG, a homebrew JSON) means rewriting
 * only this file.
 */
import type { Color } from '@/engine/color';
import type { ICard } from '@/engine/types';
import { buildA11yDescription } from '@/utils/describeCard';

export interface ScryfallImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: Array<{ image_uris?: ScryfallImageUris; name?: string }>;
  /** Letter-coded colors: 'W' 'U' 'B' 'R' 'G'. Empty array = colorless. */
  colors?: string[];
  /** Converted mana cost. */
  cmc?: number;
}

function parseStat(v: string | undefined): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

function pickImageUris(raw: ScryfallCard): ScryfallImageUris {
  return raw.image_uris ?? raw.card_faces?.[0]?.image_uris ?? {};
}

const COLOR_SET = new Set<Color>(['W', 'U', 'B', 'R', 'G']);

function deriveColor(colors: string[] | undefined): Color | undefined {
  if (!colors || colors.length !== 1) return undefined;
  const c = colors[0];
  return COLOR_SET.has(c as Color) ? (c as Color) : undefined;
}

export function adaptScryfallCard(raw: ScryfallCard): ICard {
  const power = parseStat(raw.power);
  const toughness = parseStat(raw.toughness);
  const imgs = pickImageUris(raw);
  return {
    id: raw.id,
    name: raw.name,
    power,
    toughness,
    cmc: raw.cmc ?? 0,
    color: deriveColor(raw.colors),
    manaCost: raw.mana_cost ?? '',
    typeLine: raw.type_line,
    oracleText: raw.oracle_text ?? '',
    imageUrl: imgs.normal ?? imgs.large ?? imgs.small ?? '',
    imageUrlSmall: imgs.small ?? imgs.normal ?? '',
    accessibilityDescription: buildA11yDescription({
      name: raw.name,
      manaCost: raw.mana_cost ?? '',
      typeLine: raw.type_line,
      oracleText: raw.oracle_text ?? '',
      power,
      toughness,
    }),
  };
}
