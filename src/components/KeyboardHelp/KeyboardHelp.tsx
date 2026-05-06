'use client';
import { Fragment, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './KeyboardHelp.module.css';

export interface KeyboardHelpProps {
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  descKey:
    | 'help.shortcut.help'
    | 'help.shortcut.inspect'
    | 'help.shortcut.log'
    | 'help.shortcut.handNav'
    | 'help.shortcut.handEdge'
    | 'help.shortcut.colorNav'
    | 'help.shortcut.activate'
    | 'help.shortcut.escape';
}

// Static rows — order is the shortcut's discoverability priority,
// not alphabetical: most-used shortcuts go first.
const ROWS: ShortcutRow[] = [
  { keys: ['?'], descKey: 'help.shortcut.help' },
  { keys: ['Enter', 'Space'], descKey: 'help.shortcut.activate' },
  { keys: ['I'], descKey: 'help.shortcut.inspect' },
  { keys: ['L'], descKey: 'help.shortcut.log' },
  { keys: ['←', '→'], descKey: 'help.shortcut.handNav' },
  { keys: ['Home', 'End'], descKey: 'help.shortcut.handEdge' },
  { keys: ['←', '→'], descKey: 'help.shortcut.colorNav' },
  { keys: ['Esc'], descKey: 'help.shortcut.escape' },
];

/**
 * Modal listing every keyboard shortcut wired in the app. Triggered
 * by the `?` key (Shift+/) or by the help button in the page header
 * so mouse and touch users can also see the inventory.
 *
 * Pattern is the same as CardInspector: portal'd dialog, focus the
 * close button on mount, Escape closes, click on the backdrop closes.
 * There's only one focusable element inside, so a manual Tab trap
 * isn't needed — the browser already cycles through one focusable.
 */
export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className={styles.dialog}
      >
        <h2 id="keyboard-help-title" className={styles.title}>
          {t('help.title')}
        </h2>
        <dl className={styles.list}>
          {ROWS.map((row, i) => (
            <Fragment key={`${row.descKey}-${i}`}>
              <dt>
                {row.keys.map((k, j) => (
                  <kbd key={j} className={styles.kbd}>
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd>{t(row.descKey)}</dd>
            </Fragment>
          ))}
        </dl>
        <div className={styles.actions}>
          <button ref={closeRef} type="button" onClick={onClose} className={styles.close}>
            {t('help.closeButton')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
