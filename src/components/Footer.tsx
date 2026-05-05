export interface FooterProps {
  /** Free-form provenance label for the deck source (e.g. "scryfall"),
   *  surfaced as small diagnostic text. Previously rendered in the page
   *  header; moved here to keep the game area within one viewport. */
  source?: string | null;
}

export function Footer({ source }: FooterProps = {}) {
  return (
    <footer
      lang="pt-BR"
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
        <p lang="en" style={{ margin: '0 0 12px', fontSize: 12, color: '#78909c' }}>
          Deck source: <strong>{source}</strong>
        </p>
      )}
      <p>
        <strong>Aviso Legal:</strong> Este é um projeto de portfólio não oficial, sem fins
        lucrativos. <em>Magic: The Gathering</em>, nomes de cartas, arte e marcas registradas são
        propriedade da <strong>Wizards of the Coast LLC</strong>, subsidiária da Hasbro, Inc. Este
        projeto não é produzido, endossado, apoiado ou afiliado à Wizards of the Coast. Dados e
        imagens das cartas são fornecidos pela API pública{' '}
        <a
          href="https://scryfall.com"
          rel="noreferrer noopener"
          target="_blank"
          style={{ color: '#4dd0e1' }}
        >
          Scryfall
        </a>
        , a quem agradecemos. Este conteúdo de fã é permitido sob a{' '}
        <a
          href="https://company.wizards.com/en/legal/fancontentpolicy"
          rel="noreferrer noopener"
          target="_blank"
          style={{ color: '#4dd0e1' }}
        >
          Política de Conteúdo de Fãs da Wizards of the Coast
        </a>
        .
      </p>
    </footer>
  );
}
