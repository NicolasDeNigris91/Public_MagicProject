'use client';
import type { ICard } from '@/engine/types';
import { Card } from './Card/Card';
import { useI18n } from '@/i18n/I18nProvider';

export interface BattlefieldProps {
  label: string;
  cards: ICard[];
  /** Tints the playmat warm (player) or cool (opponent). */
  variant?: 'player' | 'opponent';
  onCardActivate?: (card: ICard) => void;
  onCardInspect?: (card: ICard) => void;
  selectedId?: string | null;
}

const PLAYMAT: Record<NonNullable<BattlefieldProps['variant']>, string> = {
  player:
    'radial-gradient(ellipse at 50% 40%, rgba(255, 179, 66, 0.06), transparent 65%), ' +
    'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(0,0,0,0.12))',
  opponent:
    'radial-gradient(ellipse at 50% 60%, rgba(77, 208, 225, 0.06), transparent 65%), ' +
    'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(255,255,255,0.015))',
};

export function Battlefield({ label, cards, variant = 'player', onCardActivate, onCardInspect, selectedId }: BattlefieldProps) {
  const { t } = useI18n();
  return (
    <section
      aria-label={`${label}. ${cards.length} creature${cards.length === 1 ? '' : 's'} on the battlefield.`}
      style={{
        flex: '1 1 0',
        minHeight: 0,
        border: '1px solid rgba(120, 144, 156, 0.18)',
        borderRadius: 12,
        padding: 8,
        background: PLAYMAT[variant],
        boxShadow: 'inset 0 0 32px rgba(0, 0, 0, 0.35)',
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
            <span>{t('battlefield.empty', { label })}</span>
          </li>
        )}
        {cards.map((card) => (
          <li key={card.id} style={{ flexShrink: 0 }}>
            <Card
              card={card}
              animateEntry
              selected={card.id === selectedId}
              {...(onCardActivate ? { onActivate: onCardActivate } : {})}
              {...(onCardInspect ? { onInspect: onCardInspect } : {})}
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
