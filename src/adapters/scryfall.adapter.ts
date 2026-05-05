/**
 * Boundary between Scryfall's data shape and our engine's ICard.
 * The engine MUST NOT import anything from Scryfall - swapping card
 * data source (Lorcana, Pokemon TCG, a homebrew JSON) means rewriting
 * only this file.
 */
import { z } from 'zod';
import { cardId } from '@/engine/types';
import { buildA11yDescription } from '@/utils/describeCard';
import type { Color } from '@/engine/color';
import type { ICard } from '@/engine/types';

// Zod schemas at the network boundary. Anything matching the schema
// can be safely fed to `adaptScryfallCard`; anything that doesn't is
// dropped at parse time. Optional fields stay optional - we tolerate
// cards with missing image_uris, oracle_text, etc.
export const ScryfallImageUrisSchema = z
  .object({
    small: z.string().optional(),
    normal: z.string().optional(),
    large: z.string().optional(),
    png: z.string().optional(),
    art_crop: z.string().optional(),
  })
  .passthrough();

export const ScryfallCardSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mana_cost: z.string().optional(),
    type_line: z.string(),
    oracle_text: z.string().optional(),
    power: z.string().optional(),
    toughness: z.string().optional(),
    image_uris: ScryfallImageUrisSchema.optional(),
    card_faces: z
      .array(
        z
          .object({
            image_uris: ScryfallImageUrisSchema.optional(),
            name: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    /** Letter-coded colors: 'W' 'U' 'B' 'R' 'G'. Empty array = colorless. */
    colors: z.array(z.string()).optional(),
    /** Converted mana cost. */
    cmc: z.number().optional(),
  })
  .passthrough();

export const ScryfallSearchResponseSchema = z
  .object({
    data: z.array(z.unknown()).default([]),
  })
  .passthrough();

export type ScryfallImageUris = z.infer<typeof ScryfallImageUrisSchema>;
export type ScryfallCard = z.infer<typeof ScryfallCardSchema>;

/**
 * Validate each card individually, drop invalid ones. We don't reject
 * the whole batch on one bad apple because Scryfall's corpus is large
 * and one schema drift shouldn't kill the demo.
 */
export function parseScryfallCards(raw: unknown[]): ScryfallCard[] {
  const out: ScryfallCard[] = [];
  for (const item of raw) {
    const parsed = ScryfallCardSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
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
  const color = deriveColor(raw.colors);
  return {
    id: cardId(raw.id),
    name: raw.name,
    power,
    toughness,
    cmc: raw.cmc ?? 0,
    ...(color ? { color } : {}),
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
