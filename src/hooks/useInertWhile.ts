'use client';
import { useEffect, type RefObject } from 'react';

/**
 * Toggle the `inert` attribute on the referenced element while
 * `active` is true. Direct DOM manipulation rather than a React
 * prop, because React 18 warns on unknown DOM attributes - `inert`
 * isn't first-class until React 19.
 */
export function useInertWhile(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
    return () => {
      el.removeAttribute('inert');
    };
  }, [ref, active]);
}
