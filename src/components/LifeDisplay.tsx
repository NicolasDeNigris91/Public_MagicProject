'use client';
import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 400;
const RM_QUERY = '(prefers-reduced-motion: reduce)';

interface Props extends React.HTMLAttributes<HTMLElement> {
  value: number;
}

/**
 * Renders an integer that lerps from its previous to its current
 * `value` over 400ms using requestAnimationFrame. Under
 * `prefers-reduced-motion: reduce` it snaps to the new value.
 */
export function LifeDisplay({ value, ...rest }: Props) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);
  const [reduced, setReduced] = useState(false);

  // Subscribe to OS-level motion-preference flips so toggling the
  // setting mid-game starts snapping immediately. Reading the flag
  // only on each value change would keep animating until the next
  // life delta arrived.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(RM_QUERY);
    const apply = () => setReduced(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (prev.current === value) return;
    if (reduced) {
      setDisplayed(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const to = value;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / DURATION_MS);
      const current = Math.round(from + (to - from) * t);
      setDisplayed(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return (
    <strong role="status" aria-live="off" {...rest}>
      {displayed}
    </strong>
  );
}
