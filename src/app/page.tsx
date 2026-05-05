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
import styles from './page.module.css';

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

  // The memo's value is small (an array of 2-4 InspectorAction
  // objects), so the avoided work is mostly the array allocation and
  // the buildInspectorActions string-concat. Where it pays off is in
  // CardInspector's prop identity: a stable `actions` reference lets
  // a future React.memo wrap on CardInspector skip its re-render
  // when only the parent state changed but `inspected` did not. The
  // dependencies cover every value the closure reads — see the
  // surrounding hooks for why each is referentially stable.
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
      <main id="main" ref={mainRef} className={styles.main}>
        <header data-mtg-header className={styles.header}>
          <h1 className={styles.title}>{t('app.title')}</h1>
          <div data-mtg-turn-cluster className={styles.turnCluster}>
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
            className={`${styles.gameOver}${winner === 'opponent' ? ` ${styles.gameOverDefeat}` : ''}`}
          >
            <strong id="game-over-title" className={styles.gameOverTitle}>
              {winner === 'player' ? t('game.victory') : t('game.defeat')}
            </strong>
            <div className={styles.gameOverActions}>
              <button onClick={onPlayAgain} className={styles.control}>
                {t('game.playAgain', { color: t(`color.${playerColor}.name`) })}
              </button>
              <button onClick={handleChangeColor} className={styles.control}>
                {t('game.changeColor')}
              </button>
            </div>
          </div>
        )}

        <section aria-label={t('player.opponent')} className={styles.zone}>
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

        <section aria-label={t('player.you')} className={styles.zone}>
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
