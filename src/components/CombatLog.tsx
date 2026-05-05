'use client';
import { useEffect, useRef } from 'react';
import { useInertWhile } from '@/hooks/useInertWhile';
import { useI18n } from '@/i18n/I18nProvider';
import { useGameStore } from '@/store/useGameStore';
import styles from './CombatLog.module.css';
import type { LogKind } from '@/engine/types';

export interface CombatLogProps {
  open: boolean;
  onClose: () => void;
}

const ICON_FOR: Record<LogKind, string> = {
  info: '•',
  turn: '◆',
  draw: '↓',
  play: '+',
  combat: '⚔',
  mana: '◎',
  'game-over': '★',
};

const KIND_CLASS: Record<LogKind, string | undefined> = {
  info: undefined,
  turn: styles.entryTurn,
  draw: styles.entryDraw,
  play: styles.entryPlay,
  combat: styles.entryCombat,
  mana: styles.entryMana,
  'game-over': styles.entryGameOver,
};

// Scrollable visual history of announcements. Styled per kind:
// turn, draw, play, combat, mana, game-over.
export function CombatLog({ open, onClose }: CombatLogProps) {
  const log = useGameStore((s) => s.gameLog);
  const { t } = useI18n();
  const listRef = useRef<HTMLOListElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // aria-hidden alone leaves the close button tabbable while the panel
  // is translated off-screen. inert removes it from the focus order
  // and from AT alike, so a sighted-but-keyboard user does not "lose"
  // focus into an invisible region.
  useInertWhile(panelRef, !open);

  useEffect(() => {
    // Keep the tail in view as new entries arrive. Scroll snapping to
    // bottom is the intuition: a log should read "you are here at the
    // latest event" without manual scrolling.
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <aside
      ref={panelRef}
      aria-label={t('log.title')}
      role="region"
      className={`${styles.panel}${open ? ` ${styles.panelOpen}` : ''}`}
    >
      <header className={styles.header}>
        <strong className={styles.title}>{t('log.title')}</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('log.close')}
          className={styles.close}
        >
          ×
        </button>
      </header>
      {log.length === 0 ? (
        <p className={styles.empty}>{t('log.empty')}</p>
      ) : (
        <ol ref={listRef} className={styles.list}>
          {log.map((entry) => {
            const kind = entry.kind ?? 'info';
            const tint = KIND_CLASS[kind];
            return (
              <li key={entry.id} className={`${styles.entry}${tint ? ` ${tint}` : ''}`}>
                <span aria-hidden="true" className={styles.icon}>
                  {ICON_FOR[kind]}
                </span>
                <span className={styles.message}>{entry.message}</span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
