'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Hand } from '@/components/Hand';
import { Battlefield } from '@/components/Battlefield';
import { Footer } from '@/components/Footer';
import { CardInspector } from '@/components/CardInspector/CardInspector';
import { useGameStore } from '@/store/useGameStore';
import { useDeck } from '@/hooks/useDeck';
import { useInspector } from '@/hooks/useInspector';
import { useAttackerSelection } from '@/hooks/useAttackerSelection';
import { useInertWhile } from '@/hooks/useInertWhile';
import { usePostPlayFocus } from '@/hooks/usePostPlayFocus';
import { buildInspectorActions } from '@/utils/buildInspectorActions';

export default function GamePage() {
  const player = useGameStore((s) => s.player);
  const opponent = useGameStore((s) => s.opponent);
  const turn = useGameStore((s) => s.turn);
  const turnNumber = useGameStore((s) => s.turnNumber);
  const winner = useGameStore((s) => s.winner);
  const initialized = useGameStore((s) => s.initialized);
  const playCardToField = useGameStore((s) => s.playCardToField);
  const endTurn = useGameStore((s) => s.endTurn);
  const announce = useGameStore((s) => s.announce);

  const { source, restart } = useDeck();
  const {
    inspected,
    open: openInspector,
    close: closeInspector,
    clear: clearInspector,
  } = useInspector();
  const {
    selected: selectedAttacker,
    handleBattlefieldActivate,
    attackDirectly,
    select: selectAttacker,
    deselect: deselectAttacker,
    clear: clearAttacker,
  } = useAttackerSelection();
  const postPlayFocus = usePostPlayFocus();

  const mainRef = useRef<HTMLElement>(null);
  const gameOverRef = useRef<HTMLDivElement>(null);
  useInertWhile(mainRef, inspected !== null);

  useEffect(() => {
    if (!winner) return;
    clearInspector();
    gameOverRef.current?.focus();
  }, [winner, clearInspector]);

  const onPlayAgain = () => {
    clearAttacker();
    postPlayFocus.clear();
    restart();
  };

  const inspectorActions = useMemo(() => {
    if (!inspected) return [];
    return buildInspectorActions({
      source: inspected.source,
      isCurrentlySelectedAttacker: selectedAttacker === inspected.card.id,
      onPlay: () => {
        if (turn !== 'player') {
          announce("It's not your turn.", 'polite');
          return;
        }
        postPlayFocus.schedule(inspected.card.id);
        playCardToField('player', inspected.card.id);
      },
      onSelectAttacker: () => selectAttacker(inspected.card),
      onDeselectAttacker: () => deselectAttacker(inspected.card),
      onClose: closeInspector,
    });
  }, [
    inspected,
    selectedAttacker,
    turn,
    announce,
    playCardToField,
    postPlayFocus,
    selectAttacker,
    deselectAttacker,
    closeInspector,
  ]);

  if (!initialized) {
    return (
      <main
        id="main"
        ref={mainRef}
        aria-busy="true"
        aria-live="polite"
        style={{ padding: 32, textAlign: 'center' }}
      >
        <p>Loading deck from Scryfall…</p>
      </main>
    );
  }

  return (
    <>
      <main
        id="main"
        ref={mainRef}
        style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>MTG — Accessible Combat Demo</h1>
          <div style={{ fontSize: 13, color: '#90a4ae' }}>
            Turn <strong>{turnNumber}</strong>
            {' · '}<strong>{turn === 'player' ? 'Your move' : "Opponent's move"}</strong>
            {' · '}Plays left: <strong>{player.playsRemaining}</strong>
            {' · '}Source: {source ?? '…'}
          </div>
        </header>

        {winner && (
          <div
            ref={gameOverRef}
            tabIndex={-1}
            aria-labelledby="game-over-title"
            style={{
              padding: 16, marginBottom: 16, borderRadius: 12,
              border: `2px solid ${winner === 'player' ? '#66bb6a' : '#ef5350'}`,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}
          >
            <strong id="game-over-title" style={{ fontSize: 18 }}>
              {winner === 'player' ? 'Victory — you defeated the opponent.' : 'Defeat — your life reached zero.'}
            </strong>
            <button onClick={onPlayAgain} style={controlStyle}>
              Play again
            </button>
          </div>
        )}

        <section aria-label="Opponent">
          <h2 style={{ fontSize: 15, margin: '12px 0' }}>
            Opponent — life {opponent.life}, hand {opponent.hand.length}
          </h2>
          <Hand hand={opponent.hand} label="Opponent hand" onActivate={() => undefined} hidden />
          <Battlefield
            label="Opponent battlefield"
            cards={opponent.battlefield}
            onCardActivate={handleBattlefieldActivate}
            onCardInspect={(card) => openInspector(card, 'opponent-field')}
          />
        </section>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '20px 0' }}>
          <button
            onClick={attackDirectly}
            disabled={!selectedAttacker || !!winner}
            aria-disabled={!selectedAttacker || !!winner}
            style={controlStyle}
          >
            Attack opponent directly
          </button>
          <button
            onClick={endTurn}
            disabled={turn !== 'player' || !!winner}
            aria-disabled={turn !== 'player' || !!winner}
            style={controlStyle}
          >
            End turn
          </button>
        </div>

        <section aria-label="Player">
          <h2 style={{ fontSize: 15, margin: '12px 0' }}>
            You — life {player.life}, hand {player.hand.length}
          </h2>
          <Battlefield
            label="Your battlefield"
            cards={player.battlefield}
            onCardActivate={handleBattlefieldActivate}
            onCardInspect={(card) => openInspector(card, 'own-field')}
            selectedId={selectedAttacker}
          />
          <Hand
            hand={player.hand}
            label="Your hand"
            onActivate={(card) => openInspector(card, 'hand')}
          />
        </section>

        <Footer />
      </main>

      {inspected && (
        <CardInspector
          card={inspected.card}
          actions={inspectorActions}
          onClose={closeInspector}
        />
      )}
    </>
  );
}

const controlStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: '#263238',
  border: '1px solid #455a64',
  borderRadius: 8,
  color: '#eceff1',
  cursor: 'pointer',
};
