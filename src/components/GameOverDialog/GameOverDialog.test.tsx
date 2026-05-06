import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { GameOverDialog } from './GameOverDialog';

const baseProps = {
  title: 'Victory!',
  playAgainLabel: 'Play again',
  changeColorLabel: 'Change color',
};

describe('GameOverDialog', () => {
  it('renders as a modal dialog labelled by the title', () => {
    render(
      <GameOverDialog outcome="win" {...baseProps} onPlayAgain={vi.fn()} onChangeColor={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'game-over-title');
    expect(screen.getByText('Victory!')).toHaveAttribute('id', 'game-over-title');
  });

  it('auto-focuses the primary action on mount', () => {
    render(
      <GameOverDialog outcome="win" {...baseProps} onPlayAgain={vi.fn()} onChangeColor={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveFocus();
  });

  it('traps Tab between the two action buttons', async () => {
    const user = userEvent.setup();
    render(
      <GameOverDialog outcome="win" {...baseProps} onPlayAgain={vi.fn()} onChangeColor={vi.fn()} />,
    );
    const primary = screen.getByRole('button', { name: 'Play again' });
    const secondary = screen.getByRole('button', { name: 'Change color' });
    expect(primary).toHaveFocus();
    await user.tab();
    expect(secondary).toHaveFocus();
    // Tab from last focusable wraps back to first.
    await user.tab();
    expect(primary).toHaveFocus();
    // Shift+Tab from first goes to last.
    await user.tab({ shift: true });
    expect(secondary).toHaveFocus();
  });

  it('reclaims focus to the primary action when Tab is pressed from outside', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button data-testid="outside">Outside</button>
        <GameOverDialog
          outcome="win"
          {...baseProps}
          onPlayAgain={vi.fn()}
          onChangeColor={vi.fn()}
        />
      </>,
    );
    // Move focus outside the dialog, then press Tab — trap should
    // redirect back to the primary action regardless of where focus
    // had drifted (e.g. devtools, async-mounted overlay, etc.).
    screen.getByTestId('outside').focus();
    expect(screen.getByTestId('outside')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveFocus();
  });

  it('invokes the matching handler on click', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const onChangeColor = vi.fn();
    render(
      <GameOverDialog
        outcome="loss"
        {...baseProps}
        onPlayAgain={onPlayAgain}
        onChangeColor={onChangeColor}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Change color' }));
    expect(onChangeColor).toHaveBeenCalledTimes(1);
  });
});
