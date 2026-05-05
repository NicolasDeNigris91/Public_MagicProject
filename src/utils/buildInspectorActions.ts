export type InspectorSource = 'hand' | 'own-field' | 'opponent-field';

export type ActionVariant = 'primary' | 'secondary' | 'danger';

export interface InspectorAction {
  label: string;
  variant: ActionVariant;
  onClick: () => void;
  /** When true, the rendered button is disabled and not focusable. */
  disabled?: boolean;
  /** Optional override for the button's aria-label. Used to surface
   *  the reason a disabled action is disabled to screen readers. */
  ariaLabel?: string;
}

export interface BuildInspectorActionsArgs {
  source: InspectorSource;
  isCurrentlySelectedAttacker: boolean;
  onPlay: () => void;
  onSelectAttacker: () => void;
  onDeselectAttacker: () => void;
  onClose: () => void;
  /** When set (only meaningful for source === 'hand'), the "Play to
   *  field" action is disabled and its aria-label is set to this
   *  string. Pass `null`/`undefined` when the card is playable. */
  playDisabledReason?: string | null;
}

export function buildInspectorActions(args: BuildInspectorActionsArgs): InspectorAction[] {
  const {
    source,
    isCurrentlySelectedAttacker,
    onPlay,
    onSelectAttacker,
    onDeselectAttacker,
    onClose,
    playDisabledReason,
  } = args;

  const close: InspectorAction = { label: 'Close', variant: 'secondary', onClick: onClose };
  const cancel: InspectorAction = { label: 'Cancel', variant: 'secondary', onClick: onClose };

  if (source === 'hand') {
    const play: InspectorAction = {
      label: 'Play to field',
      variant: 'primary',
      onClick: () => {
        onPlay();
        onClose();
      },
      ...(playDisabledReason ? { disabled: true, ariaLabel: playDisabledReason } : {}),
    };
    return [play, cancel];
  }

  if (source === 'own-field') {
    if (isCurrentlySelectedAttacker) {
      return [
        {
          label: 'Deselect attacker',
          variant: 'primary',
          onClick: () => {
            onDeselectAttacker();
            onClose();
          },
        },
        close,
      ];
    }
    return [
      {
        label: 'Select as attacker',
        variant: 'primary',
        onClick: () => {
          onSelectAttacker();
          onClose();
        },
      },
      close,
    ];
  }

  if (source === 'opponent-field') {
    return [{ label: 'Close', variant: 'primary', onClick: onClose }];
  }
  const _exhaustive: never = source;
  throw new Error(`Unhandled InspectorSource: ${_exhaustive}`);
}
