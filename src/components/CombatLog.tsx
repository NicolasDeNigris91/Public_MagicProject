'use client';
import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useGameStore } from '@/store/useGameStore';
import type { LogKind } from '@/engine/types';

export interface CombatLogProps {
  open: boolean;
  onClose: () => void;
}

// Scrollable visual history of announcements. Styled per kind:
// turn, draw, play, combat, mana, game-over.
export function CombatLog({ open, onClose }: CombatLogProps) {
  const log = useGameStore((s) => s.gameLog);
  const { t } = useI18n();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Keep the tail in view as new entries arrive. Scroll snapping to
    // bottom is the intuition: a log should read "you are here at the
    // latest event" without manual scrolling.
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <aside
      aria-label={t('log.title')}
      role="region"
      aria-hidden={!open}
      style={{ ...PANEL_STYLE, transform: open ? 'translateX(0)' : 'translateX(100%)' }}
    >
      <header style={HEADER_STYLE}>
        <strong style={{ fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {t('log.title')}
        </strong>
        <button type="button" onClick={onClose} aria-label={t('log.close')} style={CLOSE_STYLE}>
          ×
        </button>
      </header>
      {log.length === 0 ? (
        <p style={EMPTY_STYLE}>{t('log.empty')}</p>
      ) : (
        <ol ref={listRef} style={LIST_STYLE}>
          {log.map((entry) => (
            <li key={entry.id} style={entryStyle(entry.kind ?? 'info')}>
              <span aria-hidden="true" style={ICON_STYLE}>
                {ICON_FOR[entry.kind ?? 'info']}
              </span>
              <span style={MSG_STYLE}>{entry.message}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
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

const KIND_TINT: Record<LogKind, { border: string; bg: string; icon: string }> = {
  info: { border: '#37474f', bg: 'transparent', icon: '#90a4ae' },
  turn: { border: '#455a64', bg: 'rgba(77,208,225,0.04)', icon: '#b0bec5' },
  draw: { border: 'rgba(77,208,225,0.6)', bg: 'rgba(77,208,225,0.05)', icon: '#4dd0e1' },
  play: { border: 'rgba(255,179,66,0.6)', bg: 'rgba(255,179,66,0.05)', icon: '#ffb74d' },
  combat: { border: 'rgba(239,83,80,0.6)', bg: 'rgba(239,83,80,0.05)', icon: '#ef5350' },
  mana: { border: 'rgba(144,202,249,0.6)', bg: 'rgba(144,202,249,0.05)', icon: '#90caf9' },
  'game-over': { border: '#ffb300', bg: 'rgba(255,179,0,0.08)', icon: '#ffca28' },
};

function entryStyle(kind: LogKind): React.CSSProperties {
  const tint = KIND_TINT[kind];
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 10px',
    borderLeft: `3px solid ${tint.border}`,
    background: tint.bg,
    fontSize: 12,
    lineHeight: 1.4,
    color: '#cfd8dc',
  };
}

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  height: '100dvh',
  width: 320,
  maxWidth: '92vw',
  background: 'rgba(13, 17, 23, 0.97)',
  borderLeft: '1px solid #37474f',
  boxShadow: '-8px 0 24px rgba(0,0,0,0.35)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 220ms ease',
  zIndex: 40,
};
const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderBottom: '1px solid #37474f',
  flexShrink: 0,
};
const CLOSE_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #455a64',
  color: '#eceff1',
  width: 28,
  height: 28,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
};
const LIST_STYLE: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '6px 8px',
  overflowY: 'auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
const ICON_STYLE: React.CSSProperties = {
  flexShrink: 0,
  width: 14,
  textAlign: 'center',
  fontSize: 12,
};
const MSG_STYLE: React.CSSProperties = { flex: 1, minWidth: 0, wordBreak: 'break-word' };
const EMPTY_STYLE: React.CSSProperties = {
  padding: '16px 12px',
  color: '#78909c',
  fontSize: 12,
  fontStyle: 'italic',
};
