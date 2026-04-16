/**
 * Boundary between Scryfall's data shape and our engine's ICard.
 * The engine MUST NOT import anything from Scryfall — swapping card
 * data source (Lorcana, Pokemon TCG, a homebrew JSON) means rewriting
 * only this file.
 */
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
}

function parseStat(v: string | undefined): number {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

function pickImageUris(raw: ScryfallCard): ScryfallImageUris {
  return raw.image_uris ?? raw.card_faces?.[0]?.image_uris ?? {};
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
