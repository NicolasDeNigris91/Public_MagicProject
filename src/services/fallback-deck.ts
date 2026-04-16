import type { ICard } from '@/engine/types';
import { buildA11yDescription } from '@/utils/describeCard';

interface Seed {
  id: string; name: string; power: number; toughness: number;
  manaCost: string; typeLine: string; oracleText: string;
}

const SEEDS: Seed[] = [
  { id: 'fb-1', name: 'Savannah Lion', power: 2, toughness: 1, manaCost: '{W}', typeLine: 'Creature — Cat', oracleText: '' },
  { id: 'fb-2', name: 'Grizzly Bears', power: 2, toughness: 2, manaCost: '{1}{G}', typeLine: 'Creature — Bear', oracleText: '' },
  { id: 'fb-3', name: 'Goblin Guide', power: 2, toughness: 2, manaCost: '{R}', typeLine: 'Creature — Goblin Scout', oracleText: 'Haste.' },
  { id: 'fb-4', name: 'Serra Angel', power: 4, toughness: 4, manaCost: '{3}{W}{W}', typeLine: 'Creature — Angel', oracleText: 'Flying, vigilance.' },
  { id: 'fb-5', name: 'Shivan Dragon', power: 5, toughness: 5, manaCost: '{4}{R}{R}', typeLine: 'Creature — Dragon', oracleText: 'Flying.' },
  { id: 'fb-6', name: 'Llanowar Elves', power: 1, toughness: 1, manaCost: '{G}', typeLine: 'Creature — Elf Druid', oracleText: 'Tap: Add green mana.' },
  { id: 'fb-7', name: 'Wind Drake', power: 2, toughness: 2, manaCost: '{2}{U}', typeLine: 'Creature — Bird', oracleText: 'Flying.' },
  { id: 'fb-8', name: 'Hill Giant', power: 3, toughness: 3, manaCost: '{3}{R}', typeLine: 'Creature — Giant', oracleText: '' },
  { id: 'fb-9', name: 'Phantom Warrior', power: 2, toughness: 2, manaCost: '{1}{U}{U}', typeLine: 'Creature — Illusion Warrior', oracleText: 'Unblockable.' },
  { id: 'fb-10', name: 'Runeclaw Bear', power: 2, toughness: 2, manaCost: '{1}{G}', typeLine: 'Creature — Bear', oracleText: '' },
  { id: 'fb-11', name: 'Air Elemental', power: 4, toughness: 4, manaCost: '{3}{U}{U}', typeLine: 'Creature — Elemental', oracleText: 'Flying.' },
  { id: 'fb-12', name: 'Centaur Courser', power: 3, toughness: 3, manaCost: '{2}{G}', typeLine: 'Creature — Centaur Warrior', oracleText: '' },
  { id: 'fb-13', name: 'Fugitive Wizard', power: 1, toughness: 1, manaCost: '{U}', typeLine: 'Creature — Human Wizard', oracleText: '' },
  { id: 'fb-14', name: 'Nightmare', power: 5, toughness: 5, manaCost: '{5}{B}', typeLine: 'Creature — Nightmare Horse', oracleText: 'Flying.' },
  { id: 'fb-15', name: 'Craw Wurm', power: 6, toughness: 4, manaCost: '{4}{G}{G}', typeLine: 'Creature — Wurm', oracleText: '' },
  { id: 'fb-16', name: 'Wall of Bone', power: 1, toughness: 4, manaCost: '{2}{B}', typeLine: 'Creature — Skeleton Wall', oracleText: 'Defender.' },
  { id: 'fb-17', name: 'Prodigal Sorcerer', power: 1, toughness: 1, manaCost: '{2}{U}', typeLine: 'Creature — Human Wizard', oracleText: 'Tap: Deal 1 damage.' },
  { id: 'fb-18', name: 'Elvish Warrior', power: 2, toughness: 3, manaCost: '{G}{G}', typeLine: 'Creature — Elf Warrior', oracleText: '' },
  { id: 'fb-19', name: 'Drudge Skeletons', power: 1, toughness: 1, manaCost: '{1}{B}', typeLine: 'Creature — Skeleton', oracleText: 'Regenerate.' },
  { id: 'fb-20', name: 'Canyon Minotaur', power: 3, toughness: 3, manaCost: '{2}{R}', typeLine: 'Creature — Minotaur Warrior', oracleText: '' },
];

export const fallbackDeck: ICard[] = SEEDS.map((s) => ({
  ...s,
  imageUrl: '',
  imageUrlSmall: '',
  accessibilityDescription: buildA11yDescription(s),
}));
