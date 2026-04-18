'use client';
/**
 * Accessible, animated card.
 *
 * A11y contract:
 * - Native <button>: focusable, activatable with Enter/Space for free.
 * - aria-label carries the FULL game-relevant description (name, type,
 *   mana cost, power/toughness, rules text). A screen-reader user gets
 *   the same information as a sighted user reading the card frame.
 * - The <img> is marked decorative (alt=""): all its semantic content
 *   is already in aria-label. Double-announcing the name would be noise.
 * - When the image fails, <CardFallback> paints a text-only card — the
 *   sighted experience degrades gracefully, the AT experience is
 *   unchanged (still driven by aria-label).
 * - prefers-reduced-motion: Framer Motion's useReducedMotion hook makes
 *   the flip snap instead of rotate. No information is conveyed only
 *   through motion.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useState, type KeyboardEvent } from 'react';
import type { ICard } from '@/engine/types';
import { CardFallback } from './CardFallback';
import styles from './Card.module.css';
import { useCombatStore } from '@/store/useCombatStore';

export interface CardProps {
  card: ICard;
  selected?: boolean;
  onActivate?: (card: ICard) => void;
  /** Opens the detailed inspector for this card. When supplied,
   *  pressing `i` while focused and clicking the visible-on-hover/focus
   *  "ⓘ" button both fire this callback. */
  onInspect?: (card: ICard) => void;
  /** If true, the card plays its "enter the battlefield" flip animation. */
  animateEntry?: boolean;
}

export function Card({ card, selected = false, onActivate, onInspect, animateEntry = false }: CardProps) {
  const [imgFailed, setImgFailed] = useState(!card.imageUrl);
  const reduceMotion = useReducedMotion();
  const inFlight = useCombatStore((s) => s.flight?.attackerId === card.id);
  const isImpacting = useCombatStore((s) => s.impactIds.includes(card.id));
  const isDying = useCombatStore((s) => s.deathIds.includes(card.id));

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate?.(card);
      return;
    }
    if (onInspect && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      onInspect(card);
    }
  };

  const targetOpacity = inFlight ? 0.3 : 1;
  const entry = animateEntry && !reduceMotion
    ? { initial: { rotateY: 180, y: -30, opacity: 0 }, animate: { rotateY: 0, y: 0, opacity: targetOpacity } }
    : { initial: false, animate: { rotateY: 0, y: 0, opacity: targetOpacity } };

  // Impact/dying animations are driven by CSS keyframes defined in
  // CombatLayer's KEYFRAMES_CSS. `isDying` takes precedence over
  // `isImpacting` so a creature that dies doesn't also shake.
  const combatAnimation = isDying
    ? 'combat-tilt-fade 350ms ease-in forwards'
    : isImpacting
      ? 'combat-shake 150ms ease-in-out, combat-flash 150ms ease-in-out'
      : undefined;

  // Attack-availability state is part of the game-relevant description
  // a screen-reader user needs, so we append it at render time rather
  // than polluting the adapter. Summoning sickness takes precedence
  // since a just-played creature hasn't had the chance to attack.
  const exhausted = card.attackedThisTurn && !card.summoningSick;
  const ariaLabel = card.summoningSick
    ? `${card.accessibilityDescription} Summoning sickness: cannot attack this turn.`
    : exhausted
      ? `${card.accessibilityDescription} Already attacked this turn.`
      : card.accessibilityDescription;

  return (
    <div className={styles.cardWrapper}>
      <motion.button
        type="button"
        layoutId={card.id}
        data-card-id={card.id}
        className={`${styles.card}${card.summoningSick || exhausted ? ` ${styles.sick}` : ''}`}
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={() => onActivate?.(card)}
        onKeyDown={handleKey}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        whileHover={reduceMotion ? undefined : { y: -6 }}
        style={combatAnimation ? { animation: combatAnimation } : undefined}
        {...entry}
      >
        {!imgFailed && card.imageUrl ? (
          // Intentional <img>: we need direct onError control for the
          // accessible fallback flow. next/image's error surface is less
          // predictable across remote domains. alt="" because the full
          // semantic description is already on the button's aria-label.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt=""
            className={styles.img}
            onError={() => setImgFailed(true)}
            loading="lazy"
          />
        ) : (
          <CardFallback card={card} />
        )}
        {card.summoningSick && (
          <span aria-hidden="true" className={styles.sickBadge}>Summoning sickness</span>
        )}
        {exhausted && (
          <span aria-hidden="true" className={styles.sickBadge}>Already attacked</span>
        )}
      </motion.button>
      {onInspect && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Inspect ${card.name}`}
          className={styles.inspectBtn}
          onClick={() => onInspect(card)}
        >
          ⓘ
        </button>
      )}
    </div>
  );
}
