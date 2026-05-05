'use client';
import { useI18n } from '@/i18n/I18nProvider';

export interface FooterProps {
  /** Free-form provenance label for the deck source (e.g. "scryfall"),
   *  surfaced as small diagnostic text. Previously rendered in the page
   *  header; moved here to keep the game area within one viewport. */
  source?: string | null;
}

export function Footer({ source }: FooterProps = {}) {
  const { t, lang } = useI18n();
  return (
    <footer
      lang={lang === 'pt' ? 'pt-BR' : 'en'}
      style={{
        marginTop: 16,
        padding: '16px',
        borderTop: '1px solid #263238',
        color: '#b0bec5',
        fontSize: 13,
        lineHeight: 1.5,
        maxWidth: 1100,
        marginInline: 'auto',
      }}
    >
      {source && (
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#78909c' }}>
          {t('footer.deckSource')}: <strong>{source}</strong>
        </p>
      )}
      <p>
        {t('footer.disclaimer')} {t('footer.scryfallThanks')}{' '}
        <a
          href="https://company.wizards.com/en/legal/fancontentpolicy"
          rel="noreferrer noopener"
          target="_blank"
          style={{ color: '#4dd0e1' }}
        >
          {t('footer.fanPolicy')}
        </a>
      </p>
    </footer>
  );
}
