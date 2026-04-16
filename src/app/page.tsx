'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Hand } from '@/components/Hand';
import { Battlefield } from '@/components/Battlefield';
import { Footer } from '@/components/Footer';
import { useGameStore } from '@/store/useGameStore';
import { fetchRandomCreatures } from '@/services/scryfall.client';
import type { ICard } from '@/engine/types';

export default function GamePage() {
  // Fine-grained selectors: avoid re-rendering the whole tree on every
  // gameLog push. Framer Motion's layout animations are expensive; we
  // only want to re-render when something visible actually changes.
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
  const gameOverRef = useRef<HTMLDivElement>(null);
  // Set when the player plays a card from hand; the layout effect
  // below moves keyboard focus to the card's new battlefield mount
  // once React has committed and Framer Motion's layout shuffle is in
  // the DOM. Using a layout effect (not rAF) avoids the race where the
  // target node isn't mounted yet during a rAF tick.
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

  // When a game ends, move keyboard focus to the game-over region so
  // AT users don't lose context. Not autoFocus (which steals focus on
  // every mount); this only fires at the transition into game-over.
  useEffect(() => {
    if (winner) gameOverRef.current?.focus();
  }, [winner]);

  const onPlayFromHand = (card: ICard) => {
    if (turn !== 'player') {
      announce("It's not your turn.", 'polite');
      return;
    }
    pendingFocusId.current = card.id;
    playCardToField('player', card.id);
  };

  // Focus restoration: keyed off battlefield growth, not a timer. When
  // the just-played card appears on the battlefield, focus its new
  // button so the keyboard user stays on the same logical card.
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
      // Compute the next selection synchronously so the announcement
      // isn't reading a stale closure.
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

  if (!initialized) {
    return (
      <main
        id="main"
        aria-busy="true"
        aria-live="polite"
        style={{ padding: 32, textAlign: 'center' }}
      >
        <p>Loading deck from Scryfall…</p>
      </main>
    );
  }

  return (
    <main id="main" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>MTG — Accessible Combat Demo</h1>
        {/* Plain text; all announcements flow through the global
            LiveRegion to prevent double-reads. */}
        <div style={{ fontSize: 13, color: '#90a4ae' }}>
          Turn <strong>{turnNumber}</strong>
          {' · '}<strong>{turn === 'player' ? 'Your move' : "Opponent's move"}</strong>
          {' · '}Plays left: <strong>{player.playsRemaining}</strong>
          {' · '}Source: {source ?? '…'}
        </div>
      </header>

      {winner && (
        /* No role="alert" here — the assertive LiveRegion already
           announces the outcome and moving focus here (via the effect
           above) brings AT context to the banner. Doubling both the
           role and the live announcement caused a near-duplicate
           read-out on NVDA / JAWS / VoiceOver. */
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
              // Reset local UI state so stale selections from the
              // previous match don't bleed in (e.g. an attacker that
              // no longer exists in the new battlefield).
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
        <Hand hand={opponent.hand} label="Opponent hand" onPlay={() => undefined} hidden />
        <Battlefield label="Opponent battlefield" cards={opponent.battlefield} onCardActivate={onBattlefieldCardActivate} />
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
          selectedId={selectedAttacker}
        />
        <Hand hand={player.hand} label="Your hand" onPlay={onPlayFromHand} />
      </section>

      <Footer />
    </main>
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
