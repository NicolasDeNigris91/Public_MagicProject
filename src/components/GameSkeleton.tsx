'use client';
import { forwardRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './GameSkeleton.module.css';

/**
 * Lightweight silhouette of the in-game layout shown while the deck is
 * being fetched and assembled. The shape (two header strips, an
 * opponent hand row, two battlefields, a player hand row) is the same
 * layout the live game lands in, so the page does not jump as the real
 * surfaces fade in. The shimmer animation is suppressed under
 * `prefers-reduced-motion` via the global media-query rule in
 * globals.css, so this component does not need to read the user
 * preference itself.
 *
 * forwardRef'd so the page can move focus onto the main element when
 * the user lands here after picking a color — otherwise focus would
 * stay on the (now-unmounted) color button.
 */
export const GameSkeleton = forwardRef<HTMLElement>(function GameSkeleton(_, ref) {
  const { t } = useI18n();
  return (
    <main ref={ref} tabIndex={-1} aria-busy="true" aria-live="polite" className={styles.wrap}>
      <span className="sr-only">{t('game.loading')}</span>
      <div aria-hidden="true" className={styles.row}>
        <div className={`${styles.block} ${styles.headerStrip}`} />
        <div className={`${styles.block} ${styles.headerCluster}`} />
      </div>
      <div aria-hidden="true" className={styles.handRow}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={`opp-${i}`} className={`${styles.block} ${styles.opponentCard}`} />
        ))}
      </div>
      <div aria-hidden="true" className={`${styles.block} ${styles.battlefield}`} />
      <div aria-hidden="true" className={`${styles.block} ${styles.battlefield}`} />
      <div aria-hidden="true" className={styles.handRow}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={`me-${i}`} className={`${styles.block} ${styles.playerCard}`} />
        ))}
      </div>
    </main>
  );
});
