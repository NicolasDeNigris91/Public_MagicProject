'use client';
import { useEffect } from 'react';
import { startObservability } from '@/lib/observability';

/**
 * Mounts the global error / unhandled-rejection listeners and the
 * Web Vitals reporters. Renders nothing — it's a side-effectful
 * boundary placed once near the root of the React tree. Safe across
 * StrictMode double-invokes because startObservability() is idempotent.
 */
export function Observability() {
  useEffect(() => {
    return startObservability();
  }, []);
  return null;
}
