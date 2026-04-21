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
        flex: '1 1 0',
        minHeight: 0,
        border: '1px dashed #37474f',
        borderRadius: 12,
        padding: 8,
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      <ul
        style={{
          display: 'flex',
          gap: 10,
          listStyle: 'none',
          margin: 0,
          padding: 0,
          flexWrap: 'nowrap',
          justifyContent: cards.length === 0 ? 'center' : 'flex-start',
          width: '100%',
        }}
      >
        {cards.length === 0 && (
          <li style={EMPTY_STYLE}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                 stroke="#546e7a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l7 7m9-7l-7 7M4 20l7-7m9 7l-7-7"/>
            </svg>
            <span>{label} — no creatures in play</span>
          </li>
        )}
        {cards.map((card) => (
          <li key={card.id} style={{ flexShrink: 0 }}>
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

const EMPTY_STYLE: React.CSSProperties = {
  color: '#78909c',
  fontStyle: 'italic',
  fontSize: 13,
  textAlign: 'center',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};
