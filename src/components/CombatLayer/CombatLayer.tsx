'use client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useCombatStore } from '@/store/useCombatStore';
import { DAMAGE_FLOAT_MS, TRAVEL_MS } from '@/constants/timings';

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
@keyframes combat-travel {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(var(--tx), var(--ty)); }
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
      {flight && <FlightClone flight={flight} />}
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
        animation: `combat-float ${DAMAGE_FLOAT_MS}ms ease-out forwards`,
      }}
    >
      -{value}
    </span>
  );
}

function FlightClone({
  flight,
}: {
  flight: NonNullable<ReturnType<typeof useCombatStore.getState>['flight']>;
}) {
  const [rects, setRects] = useState<{ from: DOMRect; to: DOMRect } | null>(null);

  useEffect(() => {
    const src = document.querySelector<HTMLElement>(`[data-card-id="${flight.attackerId}"]`);
    const dst = document.querySelector<HTMLElement>(
      flight.targetKind === 'creature'
        ? `[data-card-id="${flight.targetId}"]`
        : `[data-life-anchor="${flight.targetId}"]`,
    );
    if (src && dst) setRects({ from: src.getBoundingClientRect(), to: dst.getBoundingClientRect() });
  }, [flight]);

  if (!rects) return null;
  const dx = rects.to.left + rects.to.width / 2 - (rects.from.left + rects.from.width / 2);
  const dy = rects.to.top + rects.to.height / 2 - (rects.from.top + rects.from.height / 2);

  return (
    <div
      data-combat-clone
      style={{
        position: 'fixed',
        left: rects.from.left,
        top: rects.from.top,
        width: rects.from.width,
        height: rects.from.height,
        background: 'rgba(69, 90, 100, 0.95)',
        border: '1px solid #90a4ae',
        borderRadius: 8,
        pointerEvents: 'none',
        animation: `combat-travel ${TRAVEL_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
        ['--tx' as string]: `${dx}px`,
        ['--ty' as string]: `${dy}px`,
      }}
    />
  );
}
