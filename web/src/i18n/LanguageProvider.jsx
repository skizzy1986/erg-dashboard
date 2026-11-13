import {
  createContext,
  use,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { bootLocale, ensureLocale } from './locale.js';
import {
  DEFAULT_LANG,
  LANGS,
  LANG_TAG,
  initialLang,
  writeLangPref,
} from './lang.js';

const LanguageContext = createContext(null);

// Outside a provider (a component test that renders one view on its own) the
// control is inert and the app is English, which is what such a render shows.
const OUTSIDE = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  pending: false,
  failed: false,
};

export const useLanguage = () => useContext(LanguageContext) ?? OUTSIDE;

export default function LanguageProvider({ product, children }) {
  const [stored] = useState(initialLang);
  // A visitor who chose Spanish is held on the Suspense fallback above (the
  // themed ground) until the catalog arrives, rather than painted in English
  // and repainted: one read, and nothing for a screen reader to announce twice.
  const bootOk =
    stored === DEFAULT_LANG ? true : use(bootLocale(stored, product));

  const [lang, setLangState] = useState(() => (bootOk ? stored : DEFAULT_LANG));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(!bootOk);
  const latest = useRef(0);

  // A runtime switch never suspends: that would unmount the tree under it,
  // half-filled forms included. It waits for the catalog, then flips.
  const setLang = useCallback(
    async (next) => {
      if (!LANGS.includes(next)) return;
      const ticket = ++latest.current;
      setPending(true);
      setFailed(false);
      const ok = await ensureLocale(next, product);
      // A later choice superseded this one while its catalog was in flight.
      if (ticket !== latest.current) return;
      setPending(false);
      if (!ok) {
        setFailed(true);
        return;
      }
      i18n.activate(next);
      writeLangPref(next);
      setLangState(next);
    },
    [product]
  );

  // bootLocale activated a stored choice and dashboard.js activated English;
  // this only catches a global left on another language (a remount after a
  // failed boot). Before paint, so the wrong language is never on screen.
  useLayoutEffect(() => {
    if (i18n.locale !== lang) i18n.activate(lang);
    // Mount only: a runtime switch activates in setLang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Owns <html lang> for as long as it is mounted, and hands it back after.
  // Layout effects, so the attribute changes in the same commit as the text and
  // a screen reader never reads Spanish words under lang="en".
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('lang');
    return () => {
      if (previous == null) root.removeAttribute('lang');
      else root.setAttribute('lang', previous);
    };
  }, []);
  useLayoutEffect(() => {
    document.documentElement.setAttribute('lang', LANG_TAG[lang]);
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, pending, failed }),
    [lang, setLang, pending, failed]
  );

  return (
    <LanguageContext value={value}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </LanguageContext>
  );
}
