'use client';
import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './GameOverDialog.module.css';

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
  useFocusTrap(dialogRef);

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
