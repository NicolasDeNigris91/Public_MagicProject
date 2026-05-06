'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DAMAGE_FLOAT_MS, TRAVEL_MS } from '@/constants/timings';
import { useCombatStore } from '@/store/useCombatStore';
import styles from './CombatLayer.module.css';

/**
 * Portal overlay that renders combat animation visuals on top of the
 * game surface. Decorative only - aria-hidden throughout. Narration
 * flows through the existing live regions driven by useGameStore.
 *
 * Per-frame positioning lives in CSS variables set via
 * element.style.setProperty(), which is a CSS-OM mutation rather than
 * an authored `style=""` attribute. With no inline-style consumer left
 * in the rendered tree the CSP can drop `style-src 'unsafe-inline'`
 * (see middleware.ts + ADR 0005). The combat-* keyframes referenced
 * here live in globals.css.
 */
export function CombatLayer() {
  const flight = useCombatStore((s) => s.flight);
  const damageNumbers = useCombatStore((s) => s.damageNumbers);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (!flight && damageNumbers.length === 0) return null;

  return createPortal(
    <div data-combat-layer aria-hidden="true" className={styles.layer}>
      {damageNumbers.map((n) => (
        <DamageNumber key={n.id} anchorId={n.anchorId} value={n.value} />
      ))}
      {flight && <FlightClone flight={flight} />}
    </div>,
    document.body,
  );
}

function DamageNumber({ anchorId, value }: { anchorId: string; value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  // The bounding rect is captured once on mount. If the viewport
  // scrolls or resizes during the float animation the damage number
  // stays at its original (stale) coordinate; in practice this is
  // fine — the animation is short, input is blocked during combat,
  // and the board fits the viewport.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-card-id="${anchorId}"], [data-life-anchor="${anchorId}"]`,
    );
    if (!el || !ref.current) return;
    const rect = el.getBoundingClientRect();
    ref.current.style.setProperty('--combat-x', `${rect.left + rect.width / 2}px`);
    ref.current.style.setProperty('--combat-y', `${rect.top + rect.height / 2}px`);
    ref.current.style.setProperty('--combat-float-ms', `${DAMAGE_FLOAT_MS}ms`);
    setReady(true);
  }, [anchorId]);

  // Render the element invisibly (display:none via inline class swap)
  // until the rect is captured. We could conditionally not render at
  // all, but then the ref wouldn't attach until the next render — chicken-
  // and-egg with the effect. Instead, render with hidden attribute so
  // the ref is live but the unpositioned span never flashes.
  return (
    <span ref={ref} hidden={!ready} className={styles.damageNumber}>
      -{value}
    </span>
  );
}

function FlightClone({
  flight,
}: {
  flight: NonNullable<ReturnType<typeof useCombatStore.getState>['flight']>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const src = document.querySelector<HTMLElement>(`[data-card-id="${flight.attackerId}"]`);
    const dst = document.querySelector<HTMLElement>(
      flight.targetKind === 'creature'
        ? `[data-card-id="${flight.targetId}"]`
        : `[data-life-anchor="${flight.targetId}"]`,
    );
    if (!src || !dst || !ref.current) return;
    const from = src.getBoundingClientRect();
    const to = dst.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const el = ref.current;
    el.style.setProperty('--combat-x', `${from.left}px`);
    el.style.setProperty('--combat-y', `${from.top}px`);
    el.style.setProperty('--combat-w', `${from.width}px`);
    el.style.setProperty('--combat-h', `${from.height}px`);
    el.style.setProperty('--tx', `${dx}px`);
    el.style.setProperty('--ty', `${dy}px`);
    el.style.setProperty('--combat-travel-ms', `${TRAVEL_MS}ms`);
    setReady(true);
  }, [flight]);

  return <div ref={ref} hidden={!ready} data-combat-clone className={styles.flightClone} />;
}
