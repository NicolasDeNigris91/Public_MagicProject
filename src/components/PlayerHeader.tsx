'use client';
import { MANA_SYMBOL_URL, type Color } from '@/engine/color';
import { useI18n } from '@/i18n/I18nProvider';
import { format } from '@/i18n/messages';
import { LifeDisplay } from './LifeDisplay';
import styles from './PlayerHeader.module.css';

export interface PlayerHeaderProps {
  /** Human-facing label, e.g. "You" or "Opponent". */
  label: string;
  /** Color icon shown next to the label. Null before color selection. */
  color: Color | null;
  life: number;
  handCount: number;
  /** True during the life-change pulse so the number flashes red. */
  pulsing?: boolean;
  /** data attribute the combat overlay uses to anchor flight targets. */
  lifeAnchor: string;
  /** Unspent mana this turn. */
  manaAvailable: number;
  /** Mana pool size for this turn. */
  manaMax: number;
}

/**
 * Structured header for each player's zone. Reads as a heading for
 * screen readers (h2) and foregrounds life as the hero number while
 * keeping mana, hand count, and color symbol as secondary affordances.
 */
export function PlayerHeader({
  label,
  color,
  life,
  handCount,
  pulsing,
  lifeAnchor,
  manaAvailable,
  manaMax,
}: PlayerHeaderProps) {
  const { t } = useI18n();
  // Heading text is just the label ("You" / "Opponent"); life, mana,
  // and hand size live in a sibling <dl> so the screen-reader heading
  // outline reads cleanly under H-key navigation.
  return (
    <header className={styles.wrap}>
      <h2 className={styles.heading}>
        {color && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MANA_SYMBOL_URL[color]} alt="" className={styles.symbol} />
        )}
        <span className={styles.label}>{label}</span>
      </h2>

      <dl className={styles.dl} aria-label={format(t('inspector.statusLabel'), { label })}>
        <div className={styles.life}>
          <dt className="sr-only">{t('player.lifePrefix')}</dt>
          <dd className={styles.lifeDd}>
            <span aria-hidden="true" className={styles.heart}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#ef5350" aria-hidden="true">
                <path d="M12 21s-7.5-4.35-10-9.5C.5 7.5 3 4 6.5 4c2 0 3.5 1.2 4.5 2.7C12 5.2 13.5 4 15.5 4 19 4 21.5 7.5 20 11.5 19.5 16.65 12 21 12 21z" />
              </svg>
            </span>
            <LifeDisplay
              value={life}
              data-life-anchor={lifeAnchor}
              className={`${styles.lifeNumber}${pulsing ? ` ${styles.lifePulse}` : ''}`}
            />
          </dd>
        </div>

        <div className={styles.manaBlock}>
          <dt aria-hidden="true" className={styles.manaLabel}>
            {t('player.manaLabel')}
          </dt>
          <dd className={styles.ddReset}>
            <span className="sr-only">
              {t('player.manaLabel')} {manaAvailable} / {manaMax}
            </span>
            <span aria-hidden="true" className={styles.manaValue}>
              {manaAvailable} / {manaMax}
            </span>
          </dd>
        </div>

        <div className={styles.hand}>
          <dt aria-hidden="true" className={styles.handLabel}>
            {t('player.handLabel')}
          </dt>
          <dd className={styles.ddReset}>
            <span className="sr-only">
              {t('player.handLabel')} {handCount}{' '}
              {handCount === 1 ? t('player.handSingular') : t('player.handPlural')}
            </span>
            <span aria-hidden="true" className={styles.handCount}>
              {handCount}
            </span>
          </dd>
        </div>
      </dl>
    </header>
  );
}
