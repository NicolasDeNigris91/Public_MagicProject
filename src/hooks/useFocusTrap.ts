'use client';
import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseFocusTrapOptions {
  /**
   * When true (default), focus the first focusable inside the
   * container on mount. Pass false for dialogs that prefer to leave
   * the OS-positioned focus alone (rare).
   */
  autoFocus?: boolean;
}

/**
 * Trap Tab / Shift+Tab cycling inside the referenced container.
 *
 * - Tab from the last focusable wraps to the first.
 * - Shift+Tab from the first wraps to the last.
 * - If focus has drifted outside the container (devtools, async-
 *   mounted overlays), the next Tab reclaims it to the first
 *   focusable.
 *
 * Disabled elements are filtered out belt-and-suspenders style: the
 * CSS selector already excludes most disabled inputs, but a custom
 * `tabindex` element with `[disabled]` would otherwise sneak in.
 *
 * Pairs with `useInertWhile` for the parent's siblings — the trap
 * keeps focus inside, inert keeps focus from being able to leave by
 * other means (mouse click on a sibling, programmatic focus()).
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, options: UseFocusTrapOptions = {}): void {
  const { autoFocus = true } = options;

  useEffect(() => {
    if (!autoFocus) return;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();
  }, [ref, autoFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = ref.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled'),
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      const isInside = !!active && root.contains(active);
      if (!isInside) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ref]);
}
