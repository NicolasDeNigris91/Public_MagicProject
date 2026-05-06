import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { KeyboardHelp } from './KeyboardHelp';

// Renders without an I18nProvider so useI18n falls back to the
// default-language (pt) dictionary. Tests assert against Portuguese
// strings; en parity is enforced by TypeScript at the messages
// catalog level.

describe('KeyboardHelp', () => {
  it('renders as a modal dialog with the localized title', () => {
    render(<KeyboardHelp onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'keyboard-help-title');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Atalhos de teclado');
  });

  it('lists every shortcut with a key glyph and a description', () => {
    render(<KeyboardHelp onClose={vi.fn()} />);
    expect(screen.getByText('Mostrar este painel')).toBeInTheDocument();
    expect(screen.getByText('Inspecionar a carta em foco')).toBeInTheDocument();
    expect(screen.getByText('Abrir ou fechar o registro da partida')).toBeInTheDocument();
    expect(screen.getByText('Navegar pelas cartas da mão')).toBeInTheDocument();
    expect(screen.getByText('Primeira ou última carta da mão')).toBeInTheDocument();
    expect(screen.getByText('Navegar pelas cores na seleção')).toBeInTheDocument();
    expect(screen.getByText('Fechar diálogo aberto')).toBeInTheDocument();
    expect(screen.getByText('Jogar ou selecionar a carta em foco')).toBeInTheDocument();
  });

  it('auto-focuses the close button on mount', () => {
    render(<KeyboardHelp onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Fechar atalhos' })).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<KeyboardHelp onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<KeyboardHelp onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Fechar atalhos' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<KeyboardHelp onClose={onClose} />);
    // The backdrop is the portal's first child. Click on it (not on
    // the dialog inside) — onClose should fire because mousedown on
    // currentTarget is the close affordance.
    const backdrop =
      container.ownerDocument.querySelector<HTMLElement>('[role="dialog"]')?.parentElement;
    expect(backdrop).toBeTruthy();
    await user.pointer({ keys: '[MouseLeft>]', target: backdrop! });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
