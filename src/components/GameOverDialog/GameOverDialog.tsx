'use client';
import { useEffect, useRef } from 'react';
import styles from './GameOverDialog.module.css';

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface GameOverDialogProps {
  outcome: 'win' | 'loss';
  title: string;
  playAgainLabel: string;
  changeColorLabel: string;
  onPlayAgain: () => void;
  onChangeColor: () => void;
}

/**
 * In-flow alertdialog announcing the final game state. The panel sits
 * between the header and play zones rather than a portaled overlay so
 * the user can still scan the closing battlefield while reading the
 * outcome — informational, not concealing.
 *
 * Auto-focuses the primary action ("Play again") on mount and traps
 * Tab/Shift-Tab between the two actions so keyboard users can't drift
 * into the play area below (which the parent inerts in parallel).
 *
 * Escape is intentionally NOT wired: the game state is final by
 * design (no-undo), so dismissing the dialog without choosing a
 * follow-up would leave the user in a useless state.
 */
export function GameOverDialog({
  outcome,
  title,
  playAgainLabel,
  changeColorLabel,
  onPlayAgain,
  onChangeColor,
}: GameOverDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    first?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector));
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

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      className={`${styles.gameOver}${outcome === 'loss' ? ` ${styles.gameOverDefeat}` : ''}`}
    >
      <strong id="game-over-title" className={styles.gameOverTitle}>
        {title}
      </strong>
      <div className={styles.gameOverActions}>
        <button type="button" onClick={onPlayAgain} className={styles.control}>
          {playAgainLabel}
        </button>
        <button type="button" onClick={onChangeColor} className={styles.control}>
          {changeColorLabel}
        </button>
      </div>
    </div>
  );
}
