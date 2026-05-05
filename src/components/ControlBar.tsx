'use client';
import { useEffect, useRef, useState } from 'react';
import { FACE_BLOCKED_NOTE_MS, OPPONENT_PULSE_MS } from '@/constants/timings';
import { useI18n } from '@/i18n/I18nProvider';
import type { GameResult, PlayerId } from '@/engine/types';

export interface ControlBarProps {
  turn: PlayerId;
  winner: GameResult;
  isAnimating: boolean;
  selectedAttacker: string | null;
  opponentCreatureCount: number;
  onAttackDirectly: () => void;
  onEndTurn: () => void;
}

/**
 * Action bar between the opponent and player zones.
 *
 * Owns a transient "face attack blocked" alert that fires only when the
 * user actually clicks the direct-attack button with creatures present.
 * Keeping this state local avoids leaking timer lifecycle into the page
 * component and cleanly scopes the effect cleanup.
 */
export function ControlBar({
  turn,
  winner,
  isAnimating,
  selectedAttacker,
  opponentCreatureCount,
  onAttackDirectly,
  onEndTurn,
}: ControlBarProps) {
  const [showFaceBlockedNote, setShowFaceBlockedNote] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useI18n();

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const tryAttackDirectly = () => {
    if (opponentCreatureCount > 0) {
      setShowFaceBlockedNote(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowFaceBlockedNote(false), FACE_BLOCKED_NOTE_MS);
      return;
    }
    setShowFaceBlockedNote(false);
    onAttackDirectly();
  };

  const commonDisabled = !!winner || isAnimating;
  const attackDisabled = commonDisabled || !selectedAttacker;
  const endDisabled = commonDisabled || turn !== 'player';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        margin: '4px 0',
        flexShrink: 0,
      }}
    >
      {turn === 'opponent' && !winner && (
        <p
          aria-hidden="true"
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: 0.5,
            color: '#90a4ae',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4dd0e1',
              animation: `pulse-dot ${OPPONENT_PULSE_MS}ms ease-in-out infinite`,
            }}
          />
          {t('action.opponentThinking')}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={tryAttackDirectly}
          disabled={attackDisabled}
          aria-disabled={attackDisabled}
          aria-describedby={showFaceBlockedNote ? 'attack-direct-blocked' : undefined}
          className="btn-attack"
          style={ATTACK_STYLE}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
            <path d="M13 19l6-6" />
            <path d="M16 16l4 4" />
            <path d="M19 21l2-2" />
          </svg>
          <span>{t('action.attackDirect')}</span>
        </button>
        <button
          onClick={onEndTurn}
          disabled={endDisabled}
          aria-disabled={endDisabled}
          aria-label={t('action.endTurn')}
          className="btn-end"
          style={END_STYLE}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2h12M6 22h12" />
            <path d="M6 2v4a6 6 0 0 0 12 0V2" />
            <path d="M6 22v-4a6 6 0 0 1 12 0v4" />
          </svg>
          <span>{t('action.endTurn')}</span>
        </button>
      </div>
      {showFaceBlockedNote && (
        <p
          id="attack-direct-blocked"
          role="alert"
          style={{ margin: 0, fontSize: 12, color: '#ffb74d', textAlign: 'center' }}
        >
          {t('action.attackBlocked')}
        </p>
      )}
    </div>
  );
}

const BUTTON_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
  fontWeight: 600,
  letterSpacing: 0.2,
  transition: 'background 120ms, border-color 120ms, color 120ms, transform 120ms',
};
const ATTACK_STYLE: React.CSSProperties = {
  ...BUTTON_BASE,
  background: 'rgba(239, 83, 80, 0.12)',
  border: '1px solid rgba(239, 83, 80, 0.55)',
  color: '#ffcdd2',
};
const END_STYLE: React.CSSProperties = {
  ...BUTTON_BASE,
  background: 'transparent',
  border: '1px solid #455a64',
  color: '#b0bec5',
  fontWeight: 500,
};
