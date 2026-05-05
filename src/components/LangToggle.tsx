'use client';
import { useI18n } from '@/i18n/I18nProvider';
import { LANGS } from '@/i18n/messages';
import styles from './LangToggle.module.css';

/**
 * Two-button segmented toggle for switching UI language.
 * Uses role="group" + aria-pressed so screen readers announce both
 * the currently active language and the option to switch.
 */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t('lang.toggle')} className={styles.wrap}>
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className={`${styles.btn}${active ? ` ${styles.active}` : ''}`}
          >
            {t(`lang.${l}`)}
          </button>
        );
      })}
    </div>
  );
}
