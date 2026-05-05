'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Battlefield } from '@/components/Battlefield';
import { ColorSelection } from '@/components/ColorSelection';
import { CombatLogToggle } from '@/components/CombatLogToggle';
import { ControlBar } from '@/components/ControlBar';
import { Footer } from '@/components/Footer';
import { GameSkeleton } from '@/components/GameSkeleton';
import { Hand } from '@/components/Hand';
import { LangToggle } from '@/components/LangToggle';
import { PlayerHeader } from '@/components/PlayerHeader';
import { type Color } from '@/engine/color';
import { canAfford } from '@/engine/rules';
import { useAIOrchestrator } from '@/hooks/useAIOrchestrator';
import { useAttackerSelection } from '@/hooks/useAttackerSelection';
import { useDeck } from '@/hooks/useDeck';
import { useInertWhile } from '@/hooks/useInertWhile';
import { useInspector } from '@/hooks/useInspector';
import { usePostPlayFocus } from '@/hooks/usePostPlayFocus';
import { useI18n } from '@/i18n/I18nProvider';
import { format } from '@/i18n/messages';
import { useCombatStore } from '@/store/useCombatStore';
import { useGameStore } from '@/store/useGameStore';
import { buildInspectorActions } from '@/utils/buildInspectorActions';

// Code-split modal/overlay surfaces. None of these contribute to the
// initial paint: CombatLog only mounts when the user presses L,
// CardInspector only when a card is opened, CombatLayer only renders
// nodes during animations. Keeping them out of the entry chunk pays
// for itself on first load. ssr:false because all three are pure
// client overlays.
const CombatLog = dynamic(() => import('@/components/CombatLog').then((m) => m.CombatLog), {
  ssr: false,
});
const CardInspector = dynamic(
  () => import('@/components/CardInspector/CardInspector').then((m) => m.CardInspector),
  { ssr: false },
);
const CombatLayer = dynamic(
  () => import('@/components/CombatLayer/CombatLayer').then((m) => m.CombatLayer),
  { ssr: false },
);

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
  const [logOpen, setLogOpen] = useState(false);
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

  useEffect(() => {
    // Global shortcut: `L` toggles the match log. Bail if the user is
    // typing into a field or a modifier is held, to avoid hijacking
    // real keyboard actions.
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'l' && e.key !== 'L') return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable))
        return;
      e.preventDefault();
      setLogOpen((prev) => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
    const playDisabledReason =
      inspected.source === 'hand' && !canAfford(player, inspected.card)
        ? format(t('hand.cannotPlay.mana'), {
            name: inspected.card.name,
            cmc: inspected.card.cmc,
            available: player.manaAvailable,
          })
        : null;
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
      playDisabledReason,
    });
  }, [
    inspected,
    player,
    selectedAttacker,
    turn,
    t,
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
    return <GameSkeleton ref={loadingRef} />;
  }

  return (
    <>
      <main id="main" ref={mainRef} style={MAIN_STYLE}>
        <header data-mtg-header style={HEADER_STYLE}>
          <h1 style={{ margin: 0, fontSize: 'clamp(14px, 3.5vw, 18px)' }}>{t('app.title')}</h1>
          <div
            data-mtg-turn-cluster
            style={{
              fontSize: 'clamp(11px, 2.6vw, 13px)',
              color: '#90a4ae',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>
              {t('turn.label')} <strong>{turnNumber}</strong>
              {' · '}
              <strong>{turn === 'player' ? t('turn.yourMove') : t('turn.opponent')}</strong>
            </span>
            <CombatLogToggle open={logOpen} onToggle={() => setLogOpen((o) => !o)} />
            <LangToggle />
          </div>
        </header>

        {winner && (
          <div
            ref={gameOverRef}
            tabIndex={-1}
            aria-labelledby="game-over-title"
            style={{
              padding: 12,
              borderRadius: 12,
              border: `2px solid ${winner === 'player' ? '#66bb6a' : '#ef5350'}`,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
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
            manaAvailable={opponent.manaAvailable}
            manaMax={opponent.manaMax}
          />
          <Hand
            hand={opponent.hand}
            label={t('hand.opponent')}
            onActivate={() => undefined}
            hidden
            compact
          />
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
            manaAvailable={player.manaAvailable}
            manaMax={player.manaMax}
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

      <div id="match-log">
        <CombatLog open={logOpen} onClose={() => setLogOpen(false)} />
      </div>

      {inspected && (
        <CardInspector card={inspected.card} actions={inspectorActions} onClose={closeInspector} />
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
 * to direct flex children of <main>. This lets BOTH battlefields - one from
 * each zone - share remaining vertical space via `flex: 1 1 0` on their own
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
