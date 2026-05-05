'use client';
import { useI18n } from '@/i18n/I18nProvider';

export interface CombatLogToggleProps {
  open: boolean;
  onToggle: () => void;
}

export function CombatLogToggle({ open, onToggle }: CombatLogToggleProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="match-log"
      aria-keyshortcuts="L"
      aria-label={open ? t('log.close') : t('log.open')}
      title={`${t('log.title')} (${t('log.shortcut')})`}
      style={BTN_STYLE}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18M3 12h18M3 18h12" />
      </svg>
    </button>
  );
}

const BTN_STYLE: React.CSSProperties = {
  padding: '4px 8px',
  background: 'transparent',
  border: '1px solid #455a64',
  borderRadius: 999,
  color: '#90a4ae',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
