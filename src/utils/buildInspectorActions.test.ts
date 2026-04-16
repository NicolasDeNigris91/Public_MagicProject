import { describe, it, expect, vi } from 'vitest';
import { buildInspectorActions } from './buildInspectorActions';

describe('buildInspectorActions', () => {
  const callbacks = {
    onPlay: vi.fn(),
    onSelectAttacker: vi.fn(),
    onDeselectAttacker: vi.fn(),
    onClose: vi.fn(),
  };

  it('hand source returns Play primary + Cancel secondary', () => {
    const actions = buildInspectorActions({
      source: 'hand',
      isCurrentlySelectedAttacker: false,
      ...callbacks,
    });
    expect(actions.map((a) => a.label)).toEqual(['Play to field', 'Cancel']);
    expect(actions[0]!.variant).toBe('primary');
    expect(actions[1]!.variant).toBe('secondary');
  });

  it('own-field, not yet selected returns Select as attacker primary + Close', () => {
    const actions = buildInspectorActions({
      source: 'own-field',
      isCurrentlySelectedAttacker: false,
      ...callbacks,
    });
    expect(actions.map((a) => a.label)).toEqual(['Select as attacker', 'Close']);
    expect(actions[0]!.variant).toBe('primary');
  });

  it('own-field, already selected returns Deselect attacker primary + Close', () => {
    const actions = buildInspectorActions({
      source: 'own-field',
      isCurrentlySelectedAttacker: true,
      ...callbacks,
    });
    expect(actions.map((a) => a.label)).toEqual(['Deselect attacker', 'Close']);
  });

  it('opponent-field returns only Close (primary)', () => {
    const actions = buildInspectorActions({
      source: 'opponent-field',
      isCurrentlySelectedAttacker: false,
      ...callbacks,
    });
    expect(actions.map((a) => a.label)).toEqual(['Close']);
    expect(actions[0]!.variant).toBe('primary');
  });

  it('Play action invokes onPlay then onClose', () => {
    callbacks.onPlay.mockClear();
    callbacks.onClose.mockClear();
    const actions = buildInspectorActions({
      source: 'hand',
      isCurrentlySelectedAttacker: false,
      ...callbacks,
    });
    actions[0]!.onClick();
    expect(callbacks.onPlay).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onPlay.mock.invocationCallOrder[0]!)
      .toBeLessThan(callbacks.onClose.mock.invocationCallOrder[0]!);
  });

  it('Cancel action invokes only onClose', () => {
    callbacks.onPlay.mockClear();
    callbacks.onClose.mockClear();
    const actions = buildInspectorActions({
      source: 'hand',
      isCurrentlySelectedAttacker: false,
      ...callbacks,
    });
    actions[1]!.onClick();
    expect(callbacks.onPlay).not.toHaveBeenCalled();
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it('Select as attacker invokes onSelectAttacker then onClose', () => {
    callbacks.onSelectAttacker.mockClear();
    callbacks.onClose.mockClear();
    const actions = buildInspectorActions({
      source: 'own-field',
      isCurrentlySelectedAttacker: false,
      ...callbacks,
    });
    actions[0]!.onClick();
    expect(callbacks.onSelectAttacker).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelectAttacker.mock.invocationCallOrder[0]!)
      .toBeLessThan(callbacks.onClose.mock.invocationCallOrder[0]!);
  });

  it('Deselect attacker invokes onDeselectAttacker then onClose', () => {
    callbacks.onDeselectAttacker.mockClear();
    callbacks.onClose.mockClear();
    const actions = buildInspectorActions({
      source: 'own-field',
      isCurrentlySelectedAttacker: true,
      ...callbacks,
    });
    actions[0]!.onClick();
    expect(callbacks.onDeselectAttacker).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onDeselectAttacker.mock.invocationCallOrder[0]!)
      .toBeLessThan(callbacks.onClose.mock.invocationCallOrder[0]!);
  });
});
