'use client';
import { useReducedMotion } from 'framer-motion';
import { forwardRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * Lightweight silhouette of the in-game layout shown while the deck is
 * being fetched and assembled. The shape (two header strips, an
 * opponent hand row, two battlefields, a player hand row) is the same
 * layout the live game lands in, so the page does not jump as the real
 * surfaces fade in. Honors prefers-reduced-motion: when reduced, the
 * shimmer animation is suppressed and only the static frames remain.
 *
 * forwardRef'd so the page can move focus onto the main element when
 * the user lands here after picking a color — otherwise focus would
 * stay on the (now-unmounted) color button.
 */
export const GameSkeleton = forwardRef<HTMLElement>(function GameSkeleton(_, ref) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const block = (style: React.CSSProperties): React.CSSProperties => ({
    background: 'linear-gradient(90deg, #1c2530 0%, #2a3644 50%, #1c2530 100%)',
    backgroundSize: reduce ? 'auto' : '200% 100%',
    animation: reduce ? 'none' : 'mtg-skeleton 1.4s ease-in-out infinite',
    borderRadius: 6,
    ...style,
  });
  return (
    <main ref={ref} tabIndex={-1} aria-busy="true" aria-live="polite" style={WRAP}>
      <span className="sr-only">{t('game.loading')}</span>
      <style>{`@keyframes mtg-skeleton {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }`}</style>
      <div aria-hidden="true" style={ROW}>
        <div style={block({ width: 180, height: 24 })} />
        <div style={block({ width: 80, height: 24 })} />
      </div>
      <div aria-hidden="true" style={HAND_ROW}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={`opp-${i}`} style={block({ width: 56, height: 80 })} />
        ))}
      </div>
      <div aria-hidden="true" style={block({ width: '100%', height: 140 })} />
      <div aria-hidden="true" style={block({ width: '100%', height: 140 })} />
      <div aria-hidden="true" style={HAND_ROW}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={`me-${i}`} style={block({ width: 96, height: 134 })} />
        ))}
      </div>
    </main>
  );
});

const WRAP: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  maxWidth: 1100,
  marginInline: 'auto',
};
const ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
const HAND_ROW: React.CSSProperties = { display: 'flex', gap: 8 };
