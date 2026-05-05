'use client';
import { useEffect, useRef, useState } from 'react';
import { COLORS, MANA_SYMBOL_URL, type Color } from '@/engine/color';
import { fetchColorArt } from '@/services/scryfall.client';
import { useI18n } from '@/i18n/I18nProvider';

const SWATCH: Record<Color, string> = {
  W: '#f8f1d9',
  U: '#5686c7',
  B: '#2b2a2a',
  R: '#d04a3e',
  G: '#3d9a5f',
};

interface Props {
  onSelect: (color: Color) => void;
}

export function ColorSelection({ onSelect }: Props) {
  const buttonsRef = useRef<HTMLButtonElement[]>([]);
  const [art, setArt] = useState<Partial<Record<Color, string>>>({});
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    fetchColorArt().then((map) => {
      if (!cancelled) setArt(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowLeft' ? -1 : 1;
    const next = (idx + delta + COLORS.length) % COLORS.length;
    buttonsRef.current[next]?.focus();
  }

  return (
    <main id="main" style={WRAPPER_STYLE}>
      <fieldset style={FIELDSET_STYLE}>
        <legend style={LEGEND_STYLE}>{t('color.selectTitle')}</legend>
        <div role="toolbar" aria-label={t('color.toolbarLabel')} style={GRID_STYLE}>
          {COLORS.map((c, i) => {
            const name = t(`color.${c}.name`);
            const flavor = t(`color.${c}.flavor`);
            const artUrl = art[c];
            return (
              <button
                key={c}
                ref={(el) => {
                  if (el) buttonsRef.current[i] = el;
                }}
                type="button"
                onClick={() => onSelect(c)}
                onKeyDown={(e) => onKeyDown(e, i)}
                aria-label={`${name} - ${flavor}`}
                style={BUTTON_STYLE}
              >
                {artUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artUrl} alt="" style={ART_STYLE} loading="lazy" />
                ) : (
                  <span aria-hidden="true" style={{ ...SWATCH_STYLE, background: SWATCH[c] }} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MANA_SYMBOL_URL[c]} alt="" style={MANA_STYLE} loading="lazy" />
                <span style={FLAVOR_STYLE}>{flavor}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </main>
  );
}

const WRAPPER_STYLE: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};
const FIELDSET_STYLE: React.CSSProperties = {
  border: '1px solid #455a64',
  borderRadius: 12,
  padding: 24,
  background: 'rgba(0,0,0,0.35)',
  maxWidth: 920,
  width: '100%',
};
const LEGEND_STYLE: React.CSSProperties = { padding: '0 8px', fontSize: 16 };
const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
};
const BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '14px 10px',
  background: '#263238',
  border: '1px solid #455a64',
  borderRadius: 10,
  color: '#eceff1',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const SWATCH_STYLE: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: '2px solid #eceff1',
};
const ART_STYLE: React.CSSProperties = {
  width: 160,
  height: 117,
  objectFit: 'cover',
  borderRadius: 6,
  border: '1px solid #455a64',
};
const MANA_STYLE: React.CSSProperties = { width: 28, height: 28 };
const FLAVOR_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: '#90a4ae',
  textAlign: 'center',
  lineHeight: 1.35,
};
