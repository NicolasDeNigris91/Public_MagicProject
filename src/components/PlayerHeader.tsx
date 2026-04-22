'use client';
import { MANA_SYMBOL_URL, type Color } from '@/engine/color';
import { LifeDisplay } from './LifeDisplay';
import { IMPACT_MS } from '@/constants/timings';
import { useI18n } from '@/i18n/I18nProvider';

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
  label, color, life, handCount, pulsing, lifeAnchor, manaAvailable, manaMax,
}: PlayerHeaderProps) {
  const { t } = useI18n();
  const pulseStyle: React.CSSProperties | undefined = pulsing
    ? {
        animation: `combat-flash ${IMPACT_MS}ms ease-in-out, combat-shake ${IMPACT_MS}ms ease-in-out`,
        color: '#ef5350',
      }
    : undefined;

  return (
    <h2 style={WRAP_STYLE}>
      <span style={IDENTITY_STYLE}>
        {color && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MANA_SYMBOL_URL[color]} alt="" style={SYMBOL_STYLE} />
        )}
        <span style={LABEL_STYLE}>{label}</span>
      </span>

      <span style={LIFE_STYLE}>
        <span aria-hidden="true" style={HEART_STYLE}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ef5350" aria-hidden="true">
            <path d="M12 21s-7.5-4.35-10-9.5C.5 7.5 3 4 6.5 4c2 0 3.5 1.2 4.5 2.7C12 5.2 13.5 4 15.5 4 19 4 21.5 7.5 20 11.5 19.5 16.65 12 21 12 21z"/>
          </svg>
        </span>
        <span className="sr-only">{t('player.lifePrefix')}</span>
        <LifeDisplay
          value={life}
          data-life-anchor={lifeAnchor}
          style={{ ...LIFE_NUMBER_STYLE, ...pulseStyle }}
        />
      </span>

      <span style={MANA_BLOCK_STYLE} aria-live="polite">
        <span aria-hidden="true" style={MANA_LABEL_STYLE}>{t('player.manaLabel')}</span>
        <span style={MANA_VALUE_STYLE}>{manaAvailable} / {manaMax}</span>
      </span>

      <span style={HAND_STYLE}>
        <span className="sr-only">
          {t('player.handLabel')} {handCount} {handCount === 1 ? t('player.handSingular') : t('player.handPlural')}
        </span>
        <span aria-hidden="true" style={HAND_LABEL_STYLE}>{t('player.handLabel')}</span>
        <span aria-hidden="true" style={HAND_COUNT_STYLE}>{handCount}</span>
      </span>
    </h2>
  );
}

const WRAP_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  margin: '2px 0',
  flexShrink: 0,
  fontSize: 13,
  fontWeight: 600,
};
const IDENTITY_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  flex: '0 0 auto',
};
const SYMBOL_STYLE: React.CSSProperties = { width: 20, height: 20 };
const LABEL_STYLE: React.CSSProperties = { letterSpacing: 0.2 };
const LIFE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 10px',
  borderRadius: 999,
  background: 'rgba(239, 83, 80, 0.08)',
  border: '1px solid rgba(239, 83, 80, 0.35)',
};
const HEART_STYLE: React.CSSProperties = { display: 'inline-flex', alignItems: 'center' };
const LIFE_NUMBER_STYLE: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  minWidth: 28,
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};
const HAND_STYLE: React.CSSProperties = {
  marginLeft: 'auto',
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 4,
  color: '#90a4ae',
  fontWeight: 500,
};
const HAND_LABEL_STYLE: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 };
const HAND_COUNT_STYLE: React.CSSProperties = { fontSize: 15, color: '#eceff1', fontWeight: 700 };
const MANA_BLOCK_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 4,
  color: '#90caf9',
  fontWeight: 500,
};
const MANA_LABEL_STYLE: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 };
const MANA_VALUE_STYLE: React.CSSProperties = { fontSize: 15, color: '#eceff1', fontWeight: 700, fontVariantNumeric: 'tabular-nums' };
