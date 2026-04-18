'use client';
import { useEffect, useRef, useState } from 'react';
import type { GameResult, PlayerId } from '@/engine/types';
import { FACE_BLOCKED_NOTE_MS, OPPONENT_PULSE_MS } from '@/constants/timings';

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

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const tryAttackDirectly = () => {
    if (opponentCreatureCount > 0) {
      setShowFaceBlockedNote(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => setShowFaceBlockedNote(false),
        FACE_BLOCKED_NOTE_MS,
      );
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
        gap: 6,
        margin: '20px 0',
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
          Opponent thinking…
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={tryAttackDirectly}
          disabled={attackDisabled}
          aria-disabled={attackDisabled}
          aria-describedby={showFaceBlockedNote ? 'attack-direct-blocked' : undefined}
          style={CONTROL_STYLE}
        >
          Attack opponent directly
        </button>
        <button
          onClick={onEndTurn}
          disabled={endDisabled}
          aria-disabled={endDisabled}
          aria-label="End turn"
          style={CONTROL_STYLE}
        >
          End turn
        </button>
      </div>
      {showFaceBlockedNote && (
        <p
          id="attack-direct-blocked"
          role="alert"
          style={{ margin: 0, fontSize: 12, color: '#ffb74d', textAlign: 'center' }}
        >
          Cannot attack directly while the opponent has creatures on the battlefield.
        </p>
      )}
    </div>
  );
}

const CONTROL_STYLE: React.CSSProperties = {
  padding: '10px 18px',
  background: '#263238',
  border: '1px solid #455a64',
  borderRadius: 8,
  color: '#eceff1',
  cursor: 'pointer',
};
