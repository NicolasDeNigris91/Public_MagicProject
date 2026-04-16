'use client';
import type { ICard } from '@/engine/types';
import { Card } from './Card/Card';

export interface BattlefieldProps {
  label: string;
  cards: ICard[];
  onCardActivate?: (card: ICard) => void;
  onCardInspect?: (card: ICard) => void;
  selectedId?: string | null;
}

export function Battlefield({ label, cards, onCardActivate, onCardInspect, selectedId }: BattlefieldProps) {
  return (
    <section
      aria-label={`${label}. ${cards.length} creature${cards.length === 1 ? '' : 's'} on the battlefield.`}
      style={{
        minHeight: 240,
        border: '1px dashed #37474f',
        borderRadius: 12,
        padding: 12,
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <ul style={{ display: 'flex', gap: 12, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
        {cards.length === 0 && (
          <li style={{ color: '#78909c', fontStyle: 'italic' }}>Empty.</li>
        )}
        {cards.map((card) => (
          <li key={card.id}>
            <Card
              card={card}
              animateEntry
              selected={card.id === selectedId}
              onActivate={onCardActivate}
              onInspect={onCardInspect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
