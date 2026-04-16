export type InspectorSource = 'hand' | 'own-field' | 'opponent-field';

export type ActionVariant = 'primary' | 'secondary' | 'danger';

export interface InspectorAction {
  label: string;
  variant: ActionVariant;
  onClick: () => void;
}

export interface BuildInspectorActionsArgs {
  source: InspectorSource;
  isCurrentlySelectedAttacker: boolean;
  onPlay: () => void;
  onSelectAttacker: () => void;
  onDeselectAttacker: () => void;
  onClose: () => void;
}

export function buildInspectorActions(args: BuildInspectorActionsArgs): InspectorAction[] {
  const { source, isCurrentlySelectedAttacker, onPlay, onSelectAttacker, onDeselectAttacker, onClose } = args;

  const close: InspectorAction = { label: 'Close', variant: 'secondary', onClick: onClose };
  const cancel: InspectorAction = { label: 'Cancel', variant: 'secondary', onClick: onClose };

  if (source === 'hand') {
    return [
      { label: 'Play to field', variant: 'primary', onClick: () => { onPlay(); onClose(); } },
      cancel,
    ];
  }

  if (source === 'own-field') {
    if (isCurrentlySelectedAttacker) {
      return [
        { label: 'Deselect attacker', variant: 'primary', onClick: () => { onDeselectAttacker(); onClose(); } },
        close,
      ];
    }
    return [
      { label: 'Select as attacker', variant: 'primary', onClick: () => { onSelectAttacker(); onClose(); } },
      close,
    ];
  }

  // opponent-field
  return [{ label: 'Close', variant: 'primary', onClick: onClose }];
}
