'use client';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './Footer.module.css';

export interface FooterProps {
  /** Free-form provenance label for the deck source (e.g. "scryfall"),
   *  surfaced as small diagnostic text. Previously rendered in the page
   *  header; moved here to keep the game area within one viewport. */
  source?: string | null;
}

export function Footer({ source }: FooterProps = {}) {
  const { t, lang } = useI18n();
  return (
    <footer lang={lang === 'pt' ? 'pt-BR' : 'en'} className={styles.footer}>
      {source && (
        <p className={styles.source}>
          {t('footer.deckSource')}: <strong>{source}</strong>
        </p>
      )}
      <p>
        {t('footer.disclaimer')} {t('footer.scryfallThanks')}{' '}
        <a
          href="https://company.wizards.com/en/legal/fancontentpolicy"
          rel="noreferrer noopener"
          target="_blank"
          className={styles.link}
        >
          {t('footer.fanPolicy')}
        </a>
      </p>
    </footer>
  );
}
