import { renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useInertWhile } from './useInertWhile';
import { useRef } from 'react';

function setup(active: boolean, target: HTMLElement | null) {
  return renderHook(
    ({ active: a }) => {
      const ref = useRef<HTMLElement>(null);
      // Inject the supplied target into the ref so the hook sees it
      // without us having to render an actual DOM tree.
      (ref as { current: HTMLElement | null }).current = target;
      useInertWhile(ref, a);
      return ref;
    },
    { initialProps: { active } },
  );
}

describe('useInertWhile', () => {
  let el: HTMLElement;
  beforeEach(() => {
    el = document.createElement('section');
  });

  it('sets the inert attribute when active is true', () => {
    setup(true, el);
    expect(el.hasAttribute('inert')).toBe(true);
  });

  it('does not set inert when active is false', () => {
    setup(false, el);
    expect(el.hasAttribute('inert')).toBe(false);
  });

  it('toggles inert as active flips between true and false', () => {
    const { rerender } = setup(false, el);
    expect(el.hasAttribute('inert')).toBe(false);
    rerender({ active: true });
    expect(el.hasAttribute('inert')).toBe(true);
    rerender({ active: false });
    expect(el.hasAttribute('inert')).toBe(false);
  });

  it('removes inert on unmount even if active was true', () => {
    el.setAttribute('inert', '');
    const { unmount } = setup(true, el);
    expect(el.hasAttribute('inert')).toBe(true);
    unmount();
    expect(el.hasAttribute('inert')).toBe(false);
  });

  it('is a no-op when the ref has no current element', () => {
    expect(() => setup(true, null)).not.toThrow();
  });
});
