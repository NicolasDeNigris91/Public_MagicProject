'use client';
import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 400;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

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

  useEffect(() => {
    if (prev.current === value) return;
    if (prefersReducedMotion()) {
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
  }, [value]);

  return (
    <strong role="status" aria-live="off" {...rest}>
      {displayed}
    </strong>
  );
}
