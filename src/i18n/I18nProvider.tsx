'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { format, messages, type Lang, type MessageKey } from './messages';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'mtg-a11y-lang';
const DEFAULT_LANG: Lang = 'pt';

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start on DEFAULT_LANG on the server and the first client render to
  // avoid a hydration mismatch. Pull the persisted choice in an effect.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'pt' || saved === 'en') setLangState(saved);
    } catch {
      // localStorage unavailable (private mode, sandbox) - ignore.
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* no-op */ }
    document.documentElement.lang = l;
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => {
    const msg = messages[lang][key] ?? messages[DEFAULT_LANG][key] ?? key;
    return format(msg, vars);
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

/**
 * Falls back to the default-language dictionary when rendered outside
 * <I18nProvider> - useful in unit tests that don't want to wrap every
 * render, and harmless in prod because the provider is mounted in the
 * root layout.
 */
export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    lang: DEFAULT_LANG,
    setLang: () => undefined,
    t: (key, vars) => format(messages[DEFAULT_LANG][key] ?? key, vars),
  };
}
