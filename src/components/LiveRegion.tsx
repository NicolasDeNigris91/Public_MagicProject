'use client';
// Two live regions mounted at the root. Roles imply aria-live, so we don't
// also set aria-live (older NVDA double-announces when both are present).
import { useAnnouncer } from '@/hooks/useAnnouncer';

export function LiveRegion() {
  const { polite, politeKey, assertive, assertiveKey } = useAnnouncer();
  return (
    <>
      <div key={`polite-${politeKey}`} role="status" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div key={`assertive-${assertiveKey}`} role="alert" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </>
  );
}
