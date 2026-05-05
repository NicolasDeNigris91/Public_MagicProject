import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { FACE_BLOCKED_NOTE_MS } from '@/constants/timings';
import { ControlBar, type ControlBarProps } from './ControlBar';

function defaults(overrides: Partial<ControlBarProps> = {}): ControlBarProps {
  return {
    turn: 'player',
    winner: null,
    isAnimating: false,
    selectedAttacker: null,
    opponentCreatureCount: 0,
    onAttackDirectly: vi.fn(),
    onEndTurn: vi.fn(),
    ...overrides,
  };
}

describe('ControlBar disabled states', () => {
  it('attack is disabled when no attacker is selected', () => {
    render(<ControlBar {...defaults()} />);
    const attack = screen.getByRole('button', { name: /Atacar oponente|Attack opponent/ });
    expect(attack).toBeDisabled();
    expect(attack.getAttribute('aria-disabled')).toBe('true');
  });

  it('attack is disabled while combat is animating, even with a selected attacker', () => {
    render(<ControlBar {...defaults({ selectedAttacker: 'c1', isAnimating: true })} />);
    const attack = screen.getByRole('button', { name: /Atacar oponente|Attack opponent/ });
    expect(attack).toBeDisabled();
  });

  it('end-turn is disabled during the opponent turn', () => {
    render(<ControlBar {...defaults({ turn: 'opponent' })} />);
    const end = screen.getByRole('button', { name: /Encerrar turno|End turn/ });
    expect(end).toBeDisabled();
  });

  it('both buttons are disabled once a winner exists', () => {
    render(<ControlBar {...defaults({ winner: 'player', selectedAttacker: 'c1' })} />);
    expect(screen.getByRole('button', { name: /Atacar oponente|Attack opponent/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Encerrar turno|End turn/ })).toBeDisabled();
  });

  it('end-turn click invokes onEndTurn during the player turn', async () => {
    const onEndTurn = vi.fn();
    render(<ControlBar {...defaults({ onEndTurn })} />);
    await userEvent.click(screen.getByRole('button', { name: /Encerrar turno|End turn/ }));
    expect(onEndTurn).toHaveBeenCalledTimes(1);
  });
});

describe('ControlBar face-attack blocked alert', () => {
  // fireEvent (synchronous) over user-event because user-event's
  // advanceTimers shim is fragile in JSDOM with vi fake timers; the
  // click event itself doesn't depend on timers, only the alert's
  // setTimeout-based dismissal does.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicking attack while opponent has creatures shows a transient alert and does NOT attack', () => {
    const onAttackDirectly = vi.fn();
    render(
      <ControlBar
        {...defaults({
          selectedAttacker: 'c1',
          opponentCreatureCount: 1,
          onAttackDirectly,
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Atacar oponente|Attack opponent/ }));

    expect(onAttackDirectly).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(FACE_BLOCKED_NOTE_MS + 50);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clicking attack with an empty opponent board fires onAttackDirectly and does NOT show the alert', () => {
    const onAttackDirectly = vi.fn();
    render(
      <ControlBar
        {...defaults({ selectedAttacker: 'c1', opponentCreatureCount: 0, onAttackDirectly })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Atacar oponente|Attack opponent/ }));
    expect(onAttackDirectly).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ControlBar opponent thinking indicator', () => {
  it('renders the opponent-thinking copy only during the opponent turn with no winner', () => {
    const { rerender } = render(<ControlBar {...defaults({ turn: 'player' })} />);
    expect(screen.queryByText(/Oponente pensando|Opponent thinking/)).toBeNull();

    rerender(<ControlBar {...defaults({ turn: 'opponent' })} />);
    expect(screen.getByText(/Oponente pensando|Opponent thinking/)).toBeInTheDocument();

    rerender(<ControlBar {...defaults({ turn: 'opponent', winner: 'player' })} />);
    expect(screen.queryByText(/Oponente pensando|Opponent thinking/)).toBeNull();
  });
});
