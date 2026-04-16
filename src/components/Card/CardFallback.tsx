import styles from './Card.module.css';
import type { ICard } from '@/engine/types';

/**
 * Rendered when the Scryfall image fails (offline, 404, slow connection).
 * The fallback carries ALL the same information a sighted user would get
 * from the art + frame, in text form — so a failed image never degrades
 * the experience into guesswork.
 */
export function CardFallback({ card }: { card: ICard }) {
  return (
    <div className={styles.fallback} aria-hidden="true">
      <div className={styles.fallbackTop}>
        <span className={styles.fallbackName}>{card.name}</span>
        <span className={styles.fallbackCost}>{card.manaCost || '—'}</span>
      </div>
      <div className={styles.fallbackType}>{card.typeLine}</div>
      {card.oracleText && <div className={styles.fallbackText}>{card.oracleText}</div>}
      {/creature/i.test(card.typeLine) && (
        <div className={styles.fallbackStats}>
          {card.power}/{card.toughness}
        </div>
      )}
    </div>
  );
}
