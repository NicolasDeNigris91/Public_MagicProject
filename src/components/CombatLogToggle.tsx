'use client';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './CombatLogToggle.module.css';

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
      className={styles.btn}
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
