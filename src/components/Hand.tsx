'use client';
import { useRef, type KeyboardEvent } from 'react';
import type { ICard } from '@/engine/types';
import { Card } from './Card/Card';

/**
 * The player's hand is a listbox-like keyboard group:
 * - Tab enters the group, focus lands on first card.
 * - ArrowLeft / ArrowRight move focus between cards.
 * - Enter / Space on a card calls onActivate — the same contract as click.
 *
 * onActivate semantics changed: clicking a card no longer plays it
 * directly. The page wires onActivate to "open the inspector", and the
 * inspector's primary button is what actually plays the card.
 */
export interface HandProps {
  hand: ICard[];
  label: string;
  onActivate: (card: ICard) => void;
  hidden?: boolean;
  /** When true (typically with hidden), renders as a thin compact strip
   *  instead of full-size cards. Used for the opponent hand to keep the
   *  game visible within a single viewport. */
  compact?: boolean;
}

export function Hand({ hand, label, onActivate, hidden = false, compact = false }: HandProps) {
  const ref = useRef<HTMLUListElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const buttons = Array.from(ref.current?.querySelectorAll('button') ?? []);
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0) return;
    const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
    const target = buttons[(next + buttons.length) % buttons.length];
    target?.focus();
    e.preventDefault();
  };

  return (
    <section
      aria-label={`${label}. ${hand.length} card${hand.length === 1 ? '' : 's'}.`}
      style={{ flexShrink: 0 }}
    >
      <ul
        ref={ref}
        onKeyDown={onKeyDown}
        style={{
          display: 'flex',
          gap: compact ? 4 : 10,
          listStyle: 'none',
          margin: 0,
          padding: compact ? '2px 0' : '6px 0',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {hand.map((card) => (
          <li key={card.id} style={{ flexShrink: 0 }}>
            {hidden ? (
              <div
                aria-hidden="true"
                style={
                  compact
                    ? {
                        width: 26, height: 36, borderRadius: 4,
                        background: 'linear-gradient(135deg,#1a237e,#0d47a1)',
                        border: '1px solid #455a64',
                      }
                    : {
                        width: 160, height: 223, borderRadius: 10,
                        background: 'linear-gradient(135deg,#1a237e,#0d47a1)',
                        border: '2px solid #455a64',
                      }
                }
              />
            ) : (
              <Card card={card} onActivate={onActivate} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
