import styles from './Card.module.css';
import type { ICard } from '@/engine/types';

// Text-only card frame used when the Scryfall image fails to load.
export function CardFallback({ card }: { card: ICard }) {
  return (
    <div className={styles.fallback} aria-hidden="true">
      <div className={styles.fallbackTop}>
        <span className={styles.fallbackName}>{card.name}</span>
        <span className={styles.fallbackCost}>{card.manaCost || '-'}</span>
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
