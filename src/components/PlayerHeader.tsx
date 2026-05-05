'use client';
import { IMPACT_MS } from '@/constants/timings';
import { MANA_SYMBOL_URL, type Color } from '@/engine/color';
import { useI18n } from '@/i18n/I18nProvider';
import { format } from '@/i18n/messages';
import { LifeDisplay } from './LifeDisplay';

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
  const pulseStyle: React.CSSProperties | undefined = pulsing
    ? {
        animation: `combat-flash ${IMPACT_MS}ms ease-in-out, combat-shake ${IMPACT_MS}ms ease-in-out`,
        color: '#ef5350',
      }
    : undefined;

  // Heading text is just the label ("You" / "Opponent"); life, mana,
  // and hand size live in a sibling <dl> so the screen-reader heading
  // outline reads cleanly under H-key navigation. Previously the <h2>
  // was the flex container with all stats inside, so AT read the
  // entire row as one heading ("You 18 mana 1/1 hand 5").
  return (
    <header style={WRAP_STYLE}>
      <h2 style={HEADING_STYLE}>
        {color && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MANA_SYMBOL_URL[color]} alt="" style={SYMBOL_STYLE} />
        )}
        <span style={LABEL_STYLE}>{label}</span>
      </h2>

      <dl style={DL_STYLE} aria-label={format(t('inspector.statusLabel'), { label })}>
        <div style={LIFE_STYLE}>
          <dt className="sr-only">{t('player.lifePrefix')}</dt>
          <dd style={LIFE_DD_STYLE}>
            <span aria-hidden="true" style={HEART_STYLE}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#ef5350" aria-hidden="true">
                <path d="M12 21s-7.5-4.35-10-9.5C.5 7.5 3 4 6.5 4c2 0 3.5 1.2 4.5 2.7C12 5.2 13.5 4 15.5 4 19 4 21.5 7.5 20 11.5 19.5 16.65 12 21 12 21z" />
              </svg>
            </span>
            <LifeDisplay
              value={life}
              data-life-anchor={lifeAnchor}
              style={{ ...LIFE_NUMBER_STYLE, ...pulseStyle }}
            />
          </dd>
        </div>

        <div style={MANA_BLOCK_STYLE}>
          <dt aria-hidden="true" style={MANA_LABEL_STYLE}>
            {t('player.manaLabel')}
          </dt>
          <dd style={DD_RESET_STYLE}>
            <span className="sr-only">
              {t('player.manaLabel')} {manaAvailable} / {manaMax}
            </span>
            <span aria-hidden="true" style={MANA_VALUE_STYLE}>
              {manaAvailable} / {manaMax}
            </span>
          </dd>
        </div>

        <div style={HAND_STYLE}>
          <dt aria-hidden="true" style={HAND_LABEL_STYLE}>
            {t('player.handLabel')}
          </dt>
          <dd style={DD_RESET_STYLE}>
            <span className="sr-only">
              {t('player.handLabel')} {handCount}{' '}
              {handCount === 1 ? t('player.handSingular') : t('player.handPlural')}
            </span>
            <span aria-hidden="true" style={HAND_COUNT_STYLE}>
              {handCount}
            </span>
          </dd>
        </div>
      </dl>
    </header>
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
const HEADING_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  flex: '0 0 auto',
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
};
const DL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  margin: 0,
  flex: '1 1 auto',
};
const LIFE_DD_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  margin: 0,
};
const DD_RESET_STYLE: React.CSSProperties = {
  margin: 0,
  display: 'inline-flex',
  alignItems: 'baseline',
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
const HAND_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};
const HAND_COUNT_STYLE: React.CSSProperties = { fontSize: 15, color: '#eceff1', fontWeight: 700 };
const MANA_BLOCK_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 4,
  color: '#90caf9',
  fontWeight: 500,
};
const MANA_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};
const MANA_VALUE_STYLE: React.CSSProperties = {
  fontSize: 15,
  color: '#eceff1',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
};
