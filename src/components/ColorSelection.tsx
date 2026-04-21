'use client';
import { useRef } from 'react';
import { COLORS, COLOR_LABELS, type Color } from '@/engine/color';

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
        <legend style={LEGEND_STYLE}>Escolha sua cor</legend>
        <p style={HINT_STYLE}>
          Seu oponente jogará com uma cor diferente, também balanceada. Use as setas para navegar entre as cores.
        </p>
        <div role="toolbar" aria-label="Cores disponíveis" style={GRID_STYLE}>
          {COLORS.map((c, i) => {
            const { name, flavor } = COLOR_LABELS[c];
            return (
              <button
                key={c}
                ref={(el) => { if (el) buttonsRef.current[i] = el; }}
                type="button"
                onClick={() => onSelect(c)}
                onKeyDown={(e) => onKeyDown(e, i)}
                aria-label={`${name} — ${flavor}`}
                style={BUTTON_STYLE}
              >
                <span aria-hidden="true" style={{ ...SWATCH_STYLE, background: SWATCH[c] }} />
                <span style={NAME_STYLE}>{name}</span>
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
  padding: 20,
  background: 'rgba(0,0,0,0.35)',
  maxWidth: 620,
  width: '100%',
};
const LEGEND_STYLE: React.CSSProperties = { padding: '0 8px', fontSize: 16 };
const HINT_STYLE: React.CSSProperties = { margin: '6px 0 16px', color: '#90a4ae', fontSize: 13 };
const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
  gap: 10,
};
const BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '12px 8px',
  background: '#263238',
  border: '1px solid #455a64',
  borderRadius: 10,
  color: '#eceff1',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const SWATCH_STYLE: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  border: '2px solid #eceff1',
};
const NAME_STYLE: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const FLAVOR_STYLE: React.CSSProperties = { fontSize: 11, color: '#90a4ae', textAlign: 'center' };
