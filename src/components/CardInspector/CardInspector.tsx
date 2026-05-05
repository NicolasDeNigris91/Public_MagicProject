'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ICard } from '@/engine/types';
import { CardFallback } from '../Card/CardFallback';
import type { InspectorAction } from '@/utils/buildInspectorActions';
import styles from './CardInspector.module.css';

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MANA_SYMBOLS: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
  C: 'colorless',
  X: 'variable',
  S: 'snow',
};

function humanizeManaCostInline(cost: string): string {
  if (!cost) return 'no mana cost';
  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  if (symbols.length === 0) return 'no mana cost';
  const parts: string[] = [];
  let generic = 0;
  for (const sym of symbols) {
    const inner = sym.slice(1, -1);
    const asNum = parseInt(inner, 10);
    if (!Number.isNaN(asNum)) {
      generic += asNum;
      continue;
    }
    parts.push(MANA_SYMBOLS[inner] ?? inner.toLowerCase());
  }
  if (generic > 0) parts.unshift(`${generic} generic`);
  const grouped: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const cur = parts[i]!;
    let count = 1;
    while (parts[i + count] === cur) count += 1;
    grouped.push(count > 1 && !cur.endsWith(' generic') ? `${count} ${cur}` : cur);
    i += count;
  }
  return grouped.join(' plus ');
}

export interface CardInspectorProps {
  card: ICard;
  actions: InspectorAction[];
  onClose: () => void;
}

export function CardInspector({ card, actions, onClose }: CardInspectorProps) {
  const [imgFailed, setImgFailed] = useState(!card.imageUrl);
  const isCreature = /creature/i.test(card.typeLine);
  const manaText = humanizeManaCostInline(card.manaCost);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Initial focus: primary action (first focusable).
  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    first?.focus();
  }, []);

  // Manual focus trap: Tab / Shift+Tab cycles within the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
        className={styles.dialog}
      >
        <div className={styles.imageCell}>
          {!imgFailed && card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt=""
              className={styles.image}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className={styles.fallbackHost}>
              <CardFallback card={card} />
            </div>
          )}
        </div>
        <div className={styles.textCell}>
          <h2 id="inspector-title" className={styles.title}>
            {card.name}
          </h2>
          <dl className={styles.metaList}>
            <dt>Type</dt>
            <dd>{card.typeLine}</dd>
            <dt>Mana</dt>
            <dd>{manaText}</dd>
            {isCreature && (
              <>
                <dt>P / T</dt>
                <dd>
                  {card.power} / {card.toughness}
                </dd>
              </>
            )}
          </dl>
          {card.oracleText && <p className={styles.rules}>{card.oracleText}</p>}
          <div className={styles.actions}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                aria-disabled={a.disabled || undefined}
                aria-label={a.ariaLabel}
                className={`${styles.btn}${a.variant === 'primary' ? ' ' + styles.btnPrimary : ''}${a.variant === 'danger' ? ' ' + styles.btnDanger : ''}`}
                onClick={a.disabled ? undefined : a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
