'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ColorSelection } from '@/components/ColorSelection';
import { type Color } from '@/engine/color';
import { Hand } from '@/components/Hand';
import { LangToggle } from '@/components/LangToggle';
import { useI18n } from '@/i18n/I18nProvider';
import { Battlefield } from '@/components/Battlefield';
import { ControlBar } from '@/components/ControlBar';
import { Footer } from '@/components/Footer';
import { CardInspector } from '@/components/CardInspector/CardInspector';
import { CombatLayer } from '@/components/CombatLayer/CombatLayer';
import { PlayerHeader } from '@/components/PlayerHeader';
import { useGameStore } from '@/store/useGameStore';
import { useCombatStore } from '@/store/useCombatStore';
import { useDeck } from '@/hooks/useDeck';
import { useInspector } from '@/hooks/useInspector';
import { useAttackerSelection } from '@/hooks/useAttackerSelection';
import { useInertWhile } from '@/hooks/useInertWhile';
import { usePostPlayFocus } from '@/hooks/usePostPlayFocus';
import { useAIOrchestrator } from '@/hooks/useAIOrchestrator';
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
  const lifePulse = useCombatStore((s) => s.lifePulse);
  const isAnimating = useCombatStore((s) => s.isAnimating);

  const [playerColor, setPlayerColor] = useState<Color | null>(null);
  const { ready, source, restart, opponentColor } = useDeck(playerColor);
  const { t } = useI18n();
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
  useAIOrchestrator();

  const mainRef = useRef<HTMLElement>(null);
  const gameOverRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLElement>(null);
  useInertWhile(mainRef, inspected !== null);

  useEffect(() => {
    if (!winner) return;
    clearInspector();
    gameOverRef.current?.focus();
  }, [winner, clearInspector]);

  useEffect(() => {
    if (!ready || !playerColor || !opponentColor) return;
    const me = t(`color.${playerColor}.name`);
    const them = t(`color.${opponentColor}.name`);
    announce(t('color.announceChoice', { me, them }), 'polite');
  }, [ready, playerColor, opponentColor, announce, t]);

  useEffect(() => {
    // After the user picks a color, the previously-focused button unmounts.
    // Move focus onto the loading main so screen readers announce the busy
    // state and keyboard focus isn't stranded on <body>.
    if (playerColor && !ready) loadingRef.current?.focus();
  }, [playerColor, ready]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => useCombatStore.setState({ reducedMotion: mql.matches });
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const onPlayAgain = () => {
    clearAttacker();
    postPlayFocus.clear();
    restart();
  };

  const handleChangeColor = () => {
    clearAttacker();
    postPlayFocus.clear();
    clearInspector();
    setPlayerColor(null);
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

  if (!playerColor) {
    return <ColorSelection onSelect={setPlayerColor} />;
  }

  if (!ready || !initialized) {
    return (
      <main
        id="main"
        ref={loadingRef}
        tabIndex={-1}
        aria-busy="true"
        aria-live="polite"
        style={{ padding: 32, textAlign: 'center' }}
      >
        <p>{t('game.loading')}</p>
      </main>
    );
  }

  return (
    <>
      <main id="main" ref={mainRef} style={MAIN_STYLE}>
        <header style={HEADER_STYLE}>
          <h1 style={{ margin: 0, fontSize: 'clamp(14px, 3.5vw, 18px)' }}>{t('app.title')}</h1>
          <div style={{ fontSize: 'clamp(11px, 2.6vw, 13px)', color: '#90a4ae', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>
              {t('turn.label')} <strong>{turnNumber}</strong>
              {' · '}<strong>{turn === 'player' ? t('turn.yourMove') : t('turn.opponent')}</strong>
              {' · '}{t('turn.plays')}: <strong>{player.playsRemaining}</strong>
            </span>
            <LangToggle />
          </div>
        </header>

        {winner && (
          <div
            ref={gameOverRef}
            tabIndex={-1}
            aria-labelledby="game-over-title"
            style={{
              padding: 12, borderRadius: 12,
              border: `2px solid ${winner === 'player' ? '#66bb6a' : '#ef5350'}`,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}
          >
            <strong id="game-over-title" style={{ fontSize: 16 }}>
              {winner === 'player' ? t('game.victory') : t('game.defeat')}
            </strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onPlayAgain} style={controlStyle}>
                {t('game.playAgain', { color: t(`color.${playerColor}.name`) })}
              </button>
              <button onClick={handleChangeColor} style={controlStyle}>
                {t('game.changeColor')}
              </button>
            </div>
          </div>
        )}

        <section aria-label={t('player.opponent')} style={ZONE_STYLE}>
          <PlayerHeader
            label={t('player.opponent')}
            color={opponentColor}
            life={opponent.life}
            handCount={opponent.hand.length}
            pulsing={lifePulse === 'opponent'}
            lifeAnchor="opponent-life"
          />
          <Hand hand={opponent.hand} label={t('hand.opponent')} onActivate={() => undefined} hidden compact />
          <Battlefield
            label={t('battlefield.opponentLabel')}
            variant="opponent"
            cards={opponent.battlefield}
            onCardActivate={handleBattlefieldActivate}
            onCardInspect={(card) => openInspector(card, 'opponent-field')}
          />
        </section>

        <ControlBar
          turn={turn}
          winner={winner}
          isAnimating={isAnimating}
          selectedAttacker={selectedAttacker}
          opponentCreatureCount={opponent.battlefield.length}
          onAttackDirectly={attackDirectly}
          onEndTurn={endTurn}
        />

        <section aria-label={t('player.you')} style={ZONE_STYLE}>
          <PlayerHeader
            label={t('player.you')}
            color={playerColor}
            life={player.life}
            handCount={player.hand.length}
            pulsing={lifePulse === 'player'}
            lifeAnchor="player-life"
          />
          <Battlefield
            label={t('battlefield.yourLabel')}
            variant="player"
            cards={player.battlefield}
            onCardActivate={handleBattlefieldActivate}
            onCardInspect={(card) => openInspector(card, 'own-field')}
            selectedId={selectedAttacker}
          />
          <Hand
            hand={player.hand}
            label={t('hand.your')}
            onActivate={(card) => openInspector(card, 'hand')}
          />
        </section>
      </main>

      <CombatLayer />

      {inspected && (
        <CardInspector
          card={inspected.card}
          actions={inspectorActions}
          onClose={closeInspector}
        />
      )}

      <Footer source={source} />
    </>
  );
}

const MAIN_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  height: '100dvh',
  maxWidth: 1100,
  margin: '0 auto',
  padding: '10px 12px',
  overflow: 'hidden',
};

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
  flexShrink: 0,
};

/**
 * `display: contents` promotes the section's children (h2, hand, battlefield)
 * to direct flex children of <main>. This lets BOTH battlefields — one from
 * each zone — share remaining vertical space via `flex: 1 1 0` on their own
 * rule, instead of each zone absorbing space as a unit. Otherwise the player
 * zone's fixed-height hand would starve the player battlefield of height
 * while the opponent battlefield stays empty and huge.
 *
 * The <section aria-label="..."> still conveys the semantic grouping to
 * assistive tech; display:contents is transparent to the accessibility tree
 * in modern browsers.
 */
const ZONE_STYLE: React.CSSProperties = {
  display: 'contents',
};

const controlStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: '#263238',
  border: '1px solid #455a64',
  borderRadius: 8,
  color: '#eceff1',
  cursor: 'pointer',
};
