'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { COLORS, MANA_SYMBOL_URL, type Color } from '@/engine/color';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchColorArt } from '@/services/scryfall.client';
import styles from './ColorSelection.module.css';

const SWATCH_CLASS: Record<Color, string> = {
  W: styles.swatchW ?? '',
  U: styles.swatchU ?? '',
  B: styles.swatchB ?? '',
  R: styles.swatchR ?? '',
  G: styles.swatchG ?? '',
};

interface Props {
  onSelect: (color: Color) => void;
}

export function ColorSelection({ onSelect }: Props) {
  const buttonsRef = useRef<HTMLButtonElement[]>([]);
  const [art, setArt] = useState<Partial<Record<Color, string>>>({});
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;
    void fetchColorArt().then((map) => {
      if (!cancelled) setArt(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowLeft' ? -1 : 1;
    const next = (idx + delta + COLORS.length) % COLORS.length;
    buttonsRef.current[next]?.focus();
  }

  return (
    <main id="main" className={styles.wrapper}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t('color.selectTitle')}</legend>
        <div role="toolbar" aria-label={t('color.toolbarLabel')} className={styles.grid}>
          {COLORS.map((c, i) => {
            const name = t(`color.${c}.name`);
            const flavor = t(`color.${c}.flavor`);
            const artUrl = art[c];
            return (
              <button
                key={c}
                ref={(el) => {
                  if (el) buttonsRef.current[i] = el;
                }}
                type="button"
                onClick={() => onSelect(c)}
                onKeyDown={(e) => onKeyDown(e, i)}
                aria-label={`${name} - ${flavor}`}
                className={styles.button}
              >
                {artUrl ? (
                  <Image
                    src={artUrl}
                    alt=""
                    width={160}
                    height={117}
                    sizes="160px"
                    className={styles.art}
                    loading="lazy"
                  />
                ) : (
                  <span aria-hidden="true" className={`${styles.swatch} ${SWATCH_CLASS[c]}`} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MANA_SYMBOL_URL[c]} alt="" className={styles.mana} loading="lazy" />
                <span className={styles.flavor}>{flavor}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </main>
  );
}
