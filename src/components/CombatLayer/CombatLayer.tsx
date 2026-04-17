'use client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useCombatStore } from '@/store/useCombatStore';

const Z = 9000;

const KEYFRAMES_CSS = `
@keyframes combat-float {
  0%   { opacity: 0; transform: translate(-50%, -50%); }
  25%  { opacity: 1; transform: translate(-50%, -70%); }
  100% { opacity: 0; transform: translate(-50%, -120%); }
}
@keyframes combat-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-4px); }
  50%      { transform: translateX(4px); }
  75%      { transform: translateX(-4px); }
}
@keyframes combat-flash {
  0%, 100% { background-color: transparent; }
  50%      { background-color: rgba(255,255,255,0.8); }
}
@keyframes combat-tilt-fade {
  0%   { transform: rotate(0); opacity: 1; }
  100% { transform: rotate(12deg); opacity: 0; }
}
`;

/**
 * Portal overlay that renders combat animation visuals on top of the
 * game surface. Decorative only — aria-hidden throughout. Narration
 * flows through the existing live regions driven by useGameStore.
 */
export function CombatLayer() {
  const flight = useCombatStore((s) => s.flight);
  const damageNumbers = useCombatStore((s) => s.damageNumbers);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (document.getElementById('combat-keyframes')) return;
    const s = document.createElement('style');
    s.id = 'combat-keyframes';
    s.textContent = KEYFRAMES_CSS;
    document.head.appendChild(s);
  }, []);

  if (!mounted) return null;
  if (!flight && damageNumbers.length === 0) return null;

  return createPortal(
    <div
      data-combat-layer
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: Z,
      }}
    >
      {damageNumbers.map((n) => (
        <DamageNumber key={n.id} anchorId={n.anchorId} value={n.value} />
      ))}
    </div>,
    document.body,
  );
}

function DamageNumber({ anchorId, value }: { anchorId: string; value: number }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  // The bounding rect is captured once on mount. If the viewport
  // scrolls or resizes during the 600ms float animation the damage
  // number will be pinned to the original (stale) coordinate. In
  // practice this is fine — the animation is short, input is blocked
  // during combat (Task 12), and the board fits the viewport.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-card-id="${anchorId}"], [data-life-anchor="${anchorId}"]`,
    );
    if (el) setRect(el.getBoundingClientRect());
  }, [anchorId]);

  if (!rect) return null;
  return (
    <span
      style={{
        position: 'fixed',
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2,
        transform: 'translate(-50%, -50%)',
        color: '#ef5350',
        fontSize: 28,
        fontWeight: 900,
        textShadow: '0 2px 6px rgba(0,0,0,0.9)',
        animation: 'combat-float 600ms ease-out forwards',
      }}
    >
      -{value}
    </span>
  );
}
