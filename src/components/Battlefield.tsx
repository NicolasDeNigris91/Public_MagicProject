'use client';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './Battlefield.module.css';
import { Card } from './Card/Card';
import type { ICard } from '@/engine/types';

export interface BattlefieldProps {
  label: string;
  cards: ICard[];
  /** Tints the playmat warm (player) or cool (opponent). */
  variant?: 'player' | 'opponent';
  onCardActivate?: (card: ICard) => void;
  onCardInspect?: (card: ICard) => void;
  selectedId?: string | null;
}

export function Battlefield({
  label,
  cards,
  variant = 'player',
  onCardActivate,
  onCardInspect,
  selectedId,
}: BattlefieldProps) {
  const { t } = useI18n();
  const empty = cards.length === 0;
  return (
    <section
      aria-label={`${label}. ${cards.length} creature${cards.length === 1 ? '' : 's'} on the battlefield.`}
      className={`${styles.zone} ${styles[variant]}`}
    >
      <ul className={`${styles.list}${empty ? ` ${styles.listEmpty}` : ''}`}>
        {empty && (
          <li className={styles.empty}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              stroke="#546e7a"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4l7 7m9-7l-7 7M4 20l7-7m9 7l-7-7" />
            </svg>
            <span>{t('battlefield.empty', { label })}</span>
          </li>
        )}
        {cards.map((card) => (
          <li key={card.id} className={styles.item}>
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
