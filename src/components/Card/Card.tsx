'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useState, type KeyboardEvent } from 'react';
import { IMPACT_MS, TILT_FADE_MS } from '@/constants/timings';
import { useCombatStore } from '@/store/useCombatStore';
import styles from './Card.module.css';
import { CardFallback } from './CardFallback';
import type { ICard } from '@/engine/types';

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
  /** 1-indexed position within the surrounding set (e.g. hand). */
  posInSet?: number;
  /** Total size of the surrounding set. */
  setSize?: number;
}

export function Card({
  card,
  selected = false,
  onActivate,
  onInspect,
  animateEntry = false,
  posInSet,
  setSize,
}: CardProps) {
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
  const entry =
    animateEntry && !reduceMotion
      ? {
          initial: { rotateY: 180, y: -30, opacity: 0 },
          animate: { rotateY: 0, y: 0, opacity: targetOpacity },
        }
      : { initial: false, animate: { rotateY: 0, y: 0, opacity: targetOpacity } };

  // Impact/dying animations are driven by CSS keyframes defined in
  // CombatLayer's KEYFRAMES_CSS. `isDying` takes precedence over
  // `isImpacting` so a creature that dies doesn't also shake.
  const combatAnimation = isDying
    ? `combat-tilt-fade ${TILT_FADE_MS}ms ease-in forwards`
    : isImpacting
      ? `combat-shake ${IMPACT_MS}ms ease-in-out, combat-flash ${IMPACT_MS}ms ease-in-out`
      : undefined;

  // Append attack-availability at render time rather than baking it into
  // the adapter. Summoning sickness takes precedence over already-attacked.
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
        {...(posInSet !== undefined ? { 'aria-posinset': posInSet } : {})}
        {...(setSize !== undefined ? { 'aria-setsize': setSize } : {})}
        onClick={() => onActivate?.(card)}
        onKeyDown={handleKey}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        {...(reduceMotion ? {} : { whileHover: { y: -6 } })}
        {...(combatAnimation ? { style: { animation: combatAnimation } } : {})}
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
          <span aria-hidden="true" className={styles.sickBadge}>
            Summoning sickness
          </span>
        )}
        {exhausted && (
          <span aria-hidden="true" className={styles.sickBadge}>
            Already attacked
          </span>
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
