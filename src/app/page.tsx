'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Hand } from '@/components/Hand';
import { Battlefield } from '@/components/Battlefield';
import { Footer } from '@/components/Footer';
import { CardInspector } from '@/components/CardInspector/CardInspector';
import { useGameStore } from '@/store/useGameStore';
import { fetchRandomCreatures } from '@/services/scryfall.client';
import type { ICard } from '@/engine/types';
import {
  buildInspectorActions,
  type InspectorSource,
} from '@/utils/buildInspectorActions';

interface InspectedRef {
  card: ICard;
  source: InspectorSource;
}

export default function GamePage() {
  const player = useGameStore((s) => s.player);
  const opponent = useGameStore((s) => s.opponent);
  const turn = useGameStore((s) => s.turn);
  const turnNumber = useGameStore((s) => s.turnNumber);
  const winner = useGameStore((s) => s.winner);
  const initialized = useGameStore((s) => s.initialized);
  const initGame = useGameStore((s) => s.initGame);
  const playCardToField = useGameStore((s) => s.playCardToField);
  const attack = useGameStore((s) => s.attack);
  const endTurn = useGameStore((s) => s.endTurn);
  const announce = useGameStore((s) => s.announce);

  const [source, setSource] = useState<'scryfall' | 'fallback' | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [deckCache, setDeckCache] = useState<ICard[] | null>(null);
  const [inspected, setInspected] = useState<InspectedRef | null>(null);

  const gameOverRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchRandomCreatures(40);
      if (cancelled) return;
      setDeckCache(result.cards);
      initGame(result.cards);
      setSource(result.source);
      if (result.source === 'fallback') {
        announce(
          'Could not reach Scryfall. Playing with the built-in offline deck.',
          'assertive',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [initGame, announce]);

  useEffect(() => {
    if (winner) {
      setInspected(null);
      gameOverRef.current?.focus();
    }
  }, [winner]);

  // Toggle `inert` on <main> while the inspector is open. We use direct
  // DOM manipulation (not a React prop) to avoid React 18 warnings about
  // unknown DOM attributes.
  useEffect(() => {
    const m = mainRef.current;
    if (!m) return;
    if (inspected) m.setAttribute('inert', '');
    else m.removeAttribute('inert');
    return () => { m.removeAttribute('inert'); };
  }, [inspected]);

  // Auto-close the inspector if the inspected card disappears from
  // every zone we render (e.g. combat resolves while the modal is open).
  useEffect(() => {
    if (!inspected) return;
    const stillExists =
      player.hand.some((c) => c.id === inspected.card.id) ||
      player.battlefield.some((c) => c.id === inspected.card.id) ||
      opponent.battlefield.some((c) => c.id === inspected.card.id);
    if (!stillExists) {
      setInspected(null);
      announce('Card is no longer in play.', 'polite');
    }
  }, [inspected, player.hand, player.battlefield, opponent.battlefield, announce]);

  const closeInspector = useCallback(() => {
    const originId = inspected?.card.id ?? null;
    setInspected(null);
    requestAnimationFrame(() => {
      if (!originId) return;
      document.querySelector<HTMLElement>(`[data-card-id="${originId}"]`)?.focus();
    });
  }, [inspected]);

  const openInspector = (card: ICard, src: InspectorSource) => {
    setInspected({ card, source: src });
  };

  const onPlayFromHand = (card: ICard) => openInspector(card, 'hand');

  useLayoutEffect(() => {
    const target = pendingFocusId.current;
    if (!target) return;
    if (!player.battlefield.some((c) => c.id === target)) return;
    document.querySelector<HTMLElement>(`[data-card-id="${target}"]`)?.focus();
    pendingFocusId.current = null;
  }, [player.battlefield]);

  const onBattlefieldCardActivate = (card: ICard) => {
    const mine = player.battlefield.some((c) => c.id === card.id);
    if (mine) {
      const isDeselecting = selectedAttacker === card.id;
      setSelectedAttacker(isDeselecting ? null : card.id);
      announce(
        isDeselecting
          ? `${card.name} deselected.`
          : `${card.name} selected as attacker. Press a creature on the opponent's side to attack it, or press Attack Directly.`,
        'polite',
      );
      return;
    }
    if (selectedAttacker) {
      attack(selectedAttacker, card.id);
      setSelectedAttacker(null);
    }
  };

  const attackDirectly = () => {
    if (!selectedAttacker) return;
    attack(selectedAttacker, null);
    setSelectedAttacker(null);
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
        pendingFocusId.current = inspected.card.id;
        playCardToField('player', inspected.card.id);
      },
      onSelectAttacker: () => {
        setSelectedAttacker(inspected.card.id);
        announce(
          `${inspected.card.name} selected as attacker. Press a creature on the opponent's side to attack it, or press Attack Directly.`,
          'polite',
        );
      },
      onDeselectAttacker: () => {
        setSelectedAttacker(null);
        announce(`${inspected.card.name} deselected.`, 'polite');
      },
      onClose: closeInspector,
    });
  }, [inspected, selectedAttacker, turn, announce, playCardToField, closeInspector]);

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
            <button
              onClick={() => {
                if (!deckCache) return;
                setSelectedAttacker(null);
                pendingFocusId.current = null;
                initGame(deckCache);
              }}
              style={controlStyle}
            >
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
            onCardActivate={onBattlefieldCardActivate}
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
            onCardActivate={onBattlefieldCardActivate}
            onCardInspect={(card) => openInspector(card, 'own-field')}
            selectedId={selectedAttacker}
          />
          <Hand hand={player.hand} label="Your hand" onActivate={onPlayFromHand} />
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
