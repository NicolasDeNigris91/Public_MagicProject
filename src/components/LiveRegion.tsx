'use client';
/**
 * Two ARIA live regions, mounted once at the root.
 *
 * `role="status"` implies `aria-live="polite"` and `role="alert"`
 * implies `aria-live="assertive"` per the ARIA spec — setting both can
 * cause double-announcements on older NVDA builds. We use the roles
 * and let the implicit live-region semantics carry the contract.
 *
 * The `key` bumps on each flush so identical repeated messages remount
 * the node and re-trigger the announcement.
 */
import { useAnnouncer } from '@/hooks/useAnnouncer';

export function LiveRegion() {
  const { polite, politeKey, assertive, assertiveKey } = useAnnouncer();
  return (
    <>
      <div
        key={`polite-${politeKey}`}
        role="status"
        aria-atomic="true"
        className="sr-only"
      >
        {polite}
      </div>
      <div
        key={`assertive-${assertiveKey}`}
        role="alert"
        aria-atomic="true"
        className="sr-only"
      >
        {assertive}
      </div>
    </>
  );
}
