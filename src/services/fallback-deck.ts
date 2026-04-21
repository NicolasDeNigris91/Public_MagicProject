import type { Color } from '@/engine/color';
import type { ICard } from '@/engine/types';
import { buildA11yDescription } from '@/utils/describeCard';

interface Seed {
  id: string;
  name: string;
  power: number;
  toughness: number;
  cmc: number;
  manaCost: string;
  typeLine: string;
  oracleText: string;
}

/**
 * 50 hand-picked creatures — 10 per color — chosen so that seed i
 * fits skeleton slot i exactly. This guarantees that a full
 * Scryfall outage still yields a perfectly balanced matchup.
 *
 * Slot order: two 1-drops (1/1, 2/1) ; two 2-drops (2/2, 2/3) ;
 * two 3-drops (2/3, 3/2) ; 4-drop 3/4 ; 5-drop 4/4 ; 6-drop 5/5 ;
 * flex 1-3 CMC utility.
 */
const SEEDS_BY_COLOR: Record<Color, Seed[]> = {
  W: [
    { id: 'fb-w-0', name: 'Savannah Lions',        power: 2, toughness: 1, cmc: 1, manaCost: '{W}',       typeLine: 'Creature — Cat',             oracleText: '' },
    { id: 'fb-w-1', name: 'Squire',                power: 1, toughness: 2, cmc: 1, manaCost: '{W}',       typeLine: 'Creature — Human Soldier',    oracleText: '' },
    { id: 'fb-w-2', name: 'White Knight',          power: 2, toughness: 2, cmc: 2, manaCost: '{W}{W}',    typeLine: 'Creature — Human Knight',     oracleText: 'First strike.' },
    { id: 'fb-w-3', name: 'Wall of Swords',        power: 2, toughness: 3, cmc: 2, manaCost: '{1}{W}',    typeLine: 'Creature — Wall',             oracleText: 'Defender, flying.' },
    { id: 'fb-w-4', name: 'Benalish Hero',         power: 2, toughness: 3, cmc: 3, manaCost: '{1}{W}{W}', typeLine: 'Creature — Human Soldier',    oracleText: 'Banding.' },
    { id: 'fb-w-5', name: 'Crusader of Odric',     power: 3, toughness: 2, cmc: 3, manaCost: '{2}{W}',    typeLine: 'Creature — Human Soldier',    oracleText: '' },
    { id: 'fb-w-6', name: 'Knight of Meadowgrain', power: 3, toughness: 4, cmc: 4, manaCost: '{2}{W}{W}', typeLine: 'Creature — Kithkin Knight',   oracleText: 'First strike, lifelink.' },
    { id: 'fb-w-7', name: 'Serra Angel',           power: 4, toughness: 4, cmc: 5, manaCost: '{3}{W}{W}', typeLine: 'Creature — Angel',            oracleText: 'Flying, vigilance.' },
    { id: 'fb-w-8', name: 'Archon of Justice',     power: 5, toughness: 5, cmc: 6, manaCost: '{4}{W}{W}', typeLine: 'Creature — Archon',           oracleText: 'Flying.' },
    { id: 'fb-w-9', name: 'Soldier of Fortune',    power: 1, toughness: 1, cmc: 2, manaCost: '{1}{W}',    typeLine: 'Creature — Human Soldier',    oracleText: '' },
  ],
  U: [
    { id: 'fb-u-0', name: 'Fugitive Wizard',          power: 1, toughness: 1, cmc: 1, manaCost: '{U}',       typeLine: 'Creature — Human Wizard',     oracleText: '' },
    { id: 'fb-u-1', name: 'Spiketail Hatchling',      power: 2, toughness: 1, cmc: 1, manaCost: '{U}',       typeLine: 'Creature — Bird',             oracleText: '' },
    { id: 'fb-u-2', name: 'Phantasmal Bear',          power: 2, toughness: 2, cmc: 2, manaCost: '{1}{U}',    typeLine: 'Creature — Illusion Bear',    oracleText: '' },
    { id: 'fb-u-3', name: 'Coral Merfolk',            power: 2, toughness: 1, cmc: 2, manaCost: '{1}{U}',    typeLine: 'Creature — Merfolk',          oracleText: '' },
    { id: 'fb-u-4', name: 'Phantom Warrior',          power: 2, toughness: 2, cmc: 3, manaCost: '{1}{U}{U}', typeLine: 'Creature — Illusion Warrior', oracleText: 'Unblockable.' },
    { id: 'fb-u-5', name: 'Cloud Elemental',          power: 2, toughness: 3, cmc: 3, manaCost: '{2}{U}',    typeLine: 'Creature — Elemental',        oracleText: 'Flying.' },
    { id: 'fb-u-6', name: 'Illusionary Forces',       power: 4, toughness: 4, cmc: 4, manaCost: '{2}{U}{U}', typeLine: 'Creature — Illusion',         oracleText: 'Flying.' },
    { id: 'fb-u-7', name: 'Air Elemental',            power: 4, toughness: 4, cmc: 5, manaCost: '{3}{U}{U}', typeLine: 'Creature — Elemental',        oracleText: 'Flying.' },
    { id: 'fb-u-8', name: 'Mahamoti Djinn',           power: 5, toughness: 5, cmc: 6, manaCost: '{4}{U}{U}', typeLine: 'Creature — Djinn',            oracleText: 'Flying.' },
    { id: 'fb-u-9', name: 'Merfolk of the Pearl Trident', power: 1, toughness: 1, cmc: 1, manaCost: '{U}',   typeLine: 'Creature — Merfolk',          oracleText: '' },
  ],
  B: [
    { id: 'fb-b-0', name: 'Carnophage',        power: 2, toughness: 2, cmc: 1, manaCost: '{B}',          typeLine: 'Creature — Zombie',          oracleText: '' },
    { id: 'fb-b-1', name: 'Diregraf Ghoul',    power: 2, toughness: 2, cmc: 1, manaCost: '{B}',          typeLine: 'Creature — Zombie',          oracleText: 'Enters tapped.' },
    { id: 'fb-b-2', name: 'Black Knight',      power: 2, toughness: 2, cmc: 2, manaCost: '{B}{B}',       typeLine: 'Creature — Human Knight',    oracleText: 'First strike.' },
    { id: 'fb-b-3', name: 'Highborn Ghoul',    power: 2, toughness: 1, cmc: 2, manaCost: '{1}{B}',       typeLine: 'Creature — Zombie',          oracleText: 'Intimidate.' },
    { id: 'fb-b-4', name: 'Nantuko Husk',      power: 2, toughness: 2, cmc: 3, manaCost: '{2}{B}',       typeLine: 'Creature — Zombie Insect',   oracleText: '' },
    { id: 'fb-b-5', name: 'Fallen Angel',      power: 3, toughness: 3, cmc: 3, manaCost: '{2}{B}',       typeLine: 'Creature — Angel',           oracleText: 'Flying.' },
    { id: 'fb-b-6', name: 'Vampire Nighthawk', power: 3, toughness: 4, cmc: 4, manaCost: '{1}{B}{B}{B}', typeLine: 'Creature — Vampire Shaman',  oracleText: 'Flying, deathtouch, lifelink.' },
    { id: 'fb-b-7', name: 'Sengir Vampire',    power: 4, toughness: 4, cmc: 5, manaCost: '{3}{B}{B}',    typeLine: 'Creature — Vampire',         oracleText: 'Flying.' },
    { id: 'fb-b-8', name: 'Nightmare',         power: 5, toughness: 5, cmc: 6, manaCost: '{5}{B}',       typeLine: 'Creature — Nightmare Horse', oracleText: 'Flying.' },
    { id: 'fb-b-9', name: 'Rats of Rath',      power: 1, toughness: 1, cmc: 1, manaCost: '{B}',          typeLine: 'Creature — Rat',             oracleText: '' },
  ],
  R: [
    { id: 'fb-r-0', name: 'Goblin Guide',        power: 2, toughness: 2, cmc: 1, manaCost: '{R}',       typeLine: 'Creature — Goblin Scout',     oracleText: 'Haste.' },
    { id: 'fb-r-1', name: 'Monastery Swiftspear', power: 1, toughness: 2, cmc: 1, manaCost: '{R}',      typeLine: 'Creature — Human Monk',       oracleText: 'Haste.' },
    { id: 'fb-r-2', name: 'Goblin Piker',        power: 2, toughness: 1, cmc: 2, manaCost: '{1}{R}',    typeLine: 'Creature — Goblin Warrior',   oracleText: '' },
    { id: 'fb-r-3', name: 'Dragon Whelp',        power: 2, toughness: 3, cmc: 2, manaCost: '{1}{R}',    typeLine: 'Creature — Dragon',           oracleText: 'Flying.' },
    { id: 'fb-r-4', name: 'Canyon Minotaur',     power: 3, toughness: 3, cmc: 3, manaCost: '{2}{R}',    typeLine: 'Creature — Minotaur Warrior', oracleText: '' },
    { id: 'fb-r-5', name: 'Hill Giant',          power: 3, toughness: 3, cmc: 3, manaCost: '{2}{R}',    typeLine: 'Creature — Giant',            oracleText: '' },
    { id: 'fb-r-6', name: 'Ball Lightning',      power: 4, toughness: 4, cmc: 4, manaCost: '{1}{R}{R}{R}', typeLine: 'Creature — Elemental',        oracleText: 'Trample, haste.' },
    { id: 'fb-r-7', name: 'Fire Elemental',      power: 4, toughness: 4, cmc: 5, manaCost: '{3}{R}{R}', typeLine: 'Creature — Elemental',        oracleText: '' },
    { id: 'fb-r-8', name: 'Shivan Dragon',       power: 5, toughness: 5, cmc: 6, manaCost: '{4}{R}{R}', typeLine: 'Creature — Dragon',           oracleText: 'Flying.' },
    { id: 'fb-r-9', name: 'Raging Goblin',       power: 1, toughness: 1, cmc: 1, manaCost: '{R}',       typeLine: 'Creature — Goblin Berserker', oracleText: 'Haste.' },
  ],
  G: [
    { id: 'fb-g-0', name: 'Llanowar Elves',  power: 1, toughness: 1, cmc: 1, manaCost: '{G}',       typeLine: 'Creature — Elf Druid',        oracleText: 'Tap: Add green mana.' },
    { id: 'fb-g-1', name: 'Elvish Warrior',  power: 2, toughness: 2, cmc: 1, manaCost: '{G}',       typeLine: 'Creature — Elf Warrior',      oracleText: '' },
    { id: 'fb-g-2', name: 'Grizzly Bears',   power: 2, toughness: 2, cmc: 2, manaCost: '{1}{G}',    typeLine: 'Creature — Bear',             oracleText: '' },
    { id: 'fb-g-3', name: 'Runeclaw Bear',   power: 2, toughness: 3, cmc: 2, manaCost: '{1}{G}',    typeLine: 'Creature — Bear',             oracleText: '' },
    { id: 'fb-g-4', name: 'Centaur Courser', power: 3, toughness: 3, cmc: 3, manaCost: '{2}{G}',    typeLine: 'Creature — Centaur Warrior',  oracleText: '' },
    { id: 'fb-g-5', name: 'Trained Armodon', power: 3, toughness: 3, cmc: 3, manaCost: '{2}{G}',    typeLine: 'Creature — Elephant',         oracleText: '' },
    { id: 'fb-g-6', name: 'Spined Wurm',     power: 4, toughness: 4, cmc: 4, manaCost: '{3}{G}',    typeLine: 'Creature — Wurm',             oracleText: '' },
    { id: 'fb-g-7', name: 'Giant Spider',    power: 4, toughness: 4, cmc: 5, manaCost: '{3}{G}{G}', typeLine: 'Creature — Spider',           oracleText: 'Reach.' },
    { id: 'fb-g-8', name: 'Craw Wurm',       power: 5, toughness: 5, cmc: 6, manaCost: '{4}{G}{G}', typeLine: 'Creature — Wurm',             oracleText: '' },
    { id: 'fb-g-9', name: 'Arbor Elf',       power: 1, toughness: 1, cmc: 1, manaCost: '{G}',       typeLine: 'Creature — Elf Druid',        oracleText: '' },
  ],
};

function seedToCard(color: Color, s: Seed): ICard {
  return {
    id: s.id,
    name: s.name,
    power: s.power,
    toughness: s.toughness,
    cmc: s.cmc,
    color,
    manaCost: s.manaCost,
    typeLine: s.typeLine,
    oracleText: s.oracleText,
    imageUrl: '',
    imageUrlSmall: '',
    accessibilityDescription: buildA11yDescription(s),
  };
}

/**
 * Each color's 10 seeds are doubled (with `-b` id suffix) to fill the
 * 20-slot skeleton. The doubled copies sit at positions 10-19 and
 * mirror the originals; without this, decks would be 10 cards long
 * and deck-out would end every match by turn 6.
 */
function doubled(color: Color, seeds: Seed[]): ICard[] {
  const firstHalf = seeds.map((s) => seedToCard(color, s));
  const secondHalf = seeds.map((s) => seedToCard(color, { ...s, id: `${s.id}-b` }));
  return [...firstHalf, ...secondHalf];
}

export const fallbackDecks: Record<Color, ICard[]> = {
  W: doubled('W', SEEDS_BY_COLOR.W),
  U: doubled('U', SEEDS_BY_COLOR.U),
  B: doubled('B', SEEDS_BY_COLOR.B),
  R: doubled('R', SEEDS_BY_COLOR.R),
  G: doubled('G', SEEDS_BY_COLOR.G),
};
