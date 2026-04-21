'use client';
import { useI18n } from '@/i18n/I18nProvider';
import { LANGS, type Lang } from '@/i18n/messages';

/**
 * Two-button segmented toggle for switching UI language.
 * Uses role="group" + aria-pressed so screen readers announce both
 * the currently active language and the option to switch.
 */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t('lang.toggle')} style={WRAP_STYLE}>
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            style={{ ...BTN_STYLE, ...(active ? ACTIVE_STYLE : {}) }}
          >
            {t(`lang.${l}` as `lang.${Lang}`)}
          </button>
        );
      })}
    </div>
  );
}

const WRAP_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  gap: 0,
  border: '1px solid #455a64',
  borderRadius: 999,
  overflow: 'hidden',
  fontSize: 12,
  lineHeight: 1,
};
const BTN_STYLE: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: 'none',
  color: '#90a4ae',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
  letterSpacing: 0.4,
};
const ACTIVE_STYLE: React.CSSProperties = {
  background: '#37474f',
  color: '#eceff1',
};
