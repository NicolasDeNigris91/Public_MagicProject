'use client';
import { useRef, type KeyboardEvent } from 'react';
import { Card } from './Card/Card';
import { CardBack } from './CardBack';
import type { ICard } from '@/engine/types';

/**
 * The player's hand is a listbox-like keyboard group:
 * - Tab enters the group, focus lands on first card.
 * - ArrowLeft / ArrowRight move focus between cards.
 * - Enter / Space on a card calls onActivate - the same contract as click.
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
    const k = e.key;
    if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
    const buttons = Array.from(ref.current?.querySelectorAll('button') ?? []);
    if (buttons.length === 0) return;
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0 && k !== 'Home' && k !== 'End') return;
    let next: number;
    if (k === 'Home') next = 0;
    else if (k === 'End') next = buttons.length - 1;
    else next = ((k === 'ArrowRight' ? idx + 1 : idx - 1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
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
        {hand.map((card, i) => (
          // aria-posinset/aria-setsize live on the listitem (the <li>'s
          // implicit role) rather than the inner <button>, where axe
          // reports them as aria-allowed-attr violations.
          <li
            key={card.id}
            aria-posinset={i + 1}
            aria-setsize={hand.length}
            style={{ flexShrink: 0 }}
          >
            {hidden ? <CardBack compact={compact} /> : <Card card={card} onActivate={onActivate} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
