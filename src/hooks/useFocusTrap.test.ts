import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type RefObject } from 'react';
import { describe, it, expect } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

/**
 * The hook is a pure side-effect on the referenced container, so tests
 * mount a tiny harness that creates the container in the DOM, hands
 * the hook a literal ref pointing at it, and calls the hook through
 * renderHook so React's useEffect actually fires. Covers the same
 * surface the integrated tests in GameOverDialog.test.tsx /
 * CardInspector.test.tsx exercise — keeping the hook's contract
 * defined here too so a future ref-shape regression doesn't have to
 * be diagnosed through a consumer.
 */

function setupHarness({ buttonCount, autoFocus }: { buttonCount: number; autoFocus?: boolean }) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  for (let i = 0; i < buttonCount; i++) {
    const btn = document.createElement('button');
    btn.textContent = `btn-${i}`;
    container.appendChild(btn);
  }
  const outside = document.createElement('button');
  outside.textContent = 'outside';
  document.body.appendChild(outside);

  const ref: RefObject<HTMLDivElement> = { current: container };
  renderHook(() => useFocusTrap(ref, { autoFocus: autoFocus ?? true }));

  return {
    container,
    outside,
    buttons: Array.from(container.querySelectorAll<HTMLButtonElement>('button')),
    cleanup: () => {
      container.remove();
      outside.remove();
    },
  };
}

describe('useFocusTrap', () => {
  it('auto-focuses the first focusable in the container on mount', () => {
    const { buttons, cleanup } = setupHarness({ buttonCount: 3 });
    expect(document.activeElement).toBe(buttons[0]);
    cleanup();
  });

  it('does not auto-focus when autoFocus=false', () => {
    const before = document.activeElement;
    const { cleanup } = setupHarness({ buttonCount: 3, autoFocus: false });
    expect(document.activeElement).toBe(before);
    cleanup();
  });

  it('wraps Tab from the last focusable back to the first', async () => {
    const user = userEvent.setup();
    const { buttons, cleanup } = setupHarness({ buttonCount: 3 });
    buttons[2]!.focus();
    expect(document.activeElement).toBe(buttons[2]);
    await user.tab();
    expect(document.activeElement).toBe(buttons[0]);
    cleanup();
  });

  it('wraps Shift+Tab from the first focusable to the last', async () => {
    const user = userEvent.setup();
    const { buttons, cleanup } = setupHarness({ buttonCount: 3 });
    buttons[0]!.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(buttons[2]);
    cleanup();
  });

  it('reclaims focus to the first focusable when active is outside', async () => {
    const user = userEvent.setup();
    const { buttons, outside, cleanup } = setupHarness({ buttonCount: 3 });
    outside.focus();
    expect(document.activeElement).toBe(outside);
    await user.tab();
    expect(document.activeElement).toBe(buttons[0]);
    cleanup();
  });

  it('is a no-op when the container has no focusable children', async () => {
    const user = userEvent.setup();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const ref: RefObject<HTMLDivElement> = { current: container };
    renderHook(() => useFocusTrap(ref));
    // No throw on Tab when nothing inside is focusable.
    await user.tab();
    expect(document.activeElement).toBe(document.body);
    container.remove();
  });

  it('skips disabled buttons even though they match the tabindex selector', async () => {
    const user = userEvent.setup();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const a = document.createElement('button');
    a.textContent = 'a';
    const b = document.createElement('button');
    b.textContent = 'b';
    b.setAttribute('disabled', '');
    b.setAttribute('tabindex', '0');
    const c = document.createElement('button');
    c.textContent = 'c';
    container.append(a, b, c);
    const ref: RefObject<HTMLDivElement> = { current: container };
    renderHook(() => useFocusTrap(ref));
    expect(document.activeElement).toBe(a);
    await user.tab();
    // Disabled button is filtered out: Tab from `a` lands on `c`.
    expect(document.activeElement).toBe(c);
    await user.tab();
    expect(document.activeElement).toBe(a);
    container.remove();
  });
});
