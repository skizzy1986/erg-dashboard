// The language preference, readable before any product chunk has loaded. Plain
// data and functions, no Lingui: RouteRoot's offline message and the root error
// fallback render from here, and both sit in front of the chunk that would
// bring Lingui in. One key serves the dashboard and /squat, so a switch in
// either is honoured by the other on its next load.

import { safeStorage } from '../utils/squatTheme.js';

export const LANG_KEY = 'splitiq.lang';
export const LANGS = ['en', 'es'];
export const DEFAULT_LANG = 'en';
export const LANG_TAG = { en: 'en', es: 'es-CO' };

// The language control is shared by both products, so its few words live here
// rather than in either product's catalog.
export const LANG_UI = {
  label: { en: 'Language', es: 'Idioma' },
  native: { en: 'English', es: 'Español' },
  switchTo: {
    en: 'Language: English (EN). Switch to Spanish',
    es: 'Idioma: español (ES). Cambiar a inglés',
  },
  // Only ever shown in English: it reports that Spanish did not arrive. Reload,
  // not retry: a browser may keep a failed dynamic import for the life of the
  // page, so choosing Spanish again without a reload can fail the same way.
  unavailable: {
    en: 'Spanish could not be loaded. Check your connection and reload the page.',
  },
};

// Shown before the squat tool's chunk exists (RouteRoot).
export const OFFLINE_TEXT = {
  en: 'The squat tool needs a connection the first time. Reconnect and reload.',
  es: 'La herramienta de sentadilla necesita conexión la primera vez. Conéctate y vuelve a cargar.',
};

// The root error fallback renders outside every provider, possibly before the
// dashboard's catalog has loaded, so it cannot go through Lingui.
export const ROOT_ERROR_TEXT = {
  heading: { en: 'SOMETHING WENT WRONG', es: 'ALGO SALIÓ MAL' },
  body: {
    en: 'The error has been reported. Try again, and if it keeps happening reload the app.',
    es: 'Ya reportamos el error. Inténtalo de nuevo y, si sigue pasando, vuelve a cargar la app.',
  },
  retry: { en: 'TRY AGAIN', es: 'INTÉNTALO DE NUEVO' },
};

export function readLangPref(storage) {
  try {
    const v = storage?.getItem(LANG_KEY);
    return LANGS.includes(v) ? v : DEFAULT_LANG;
  } catch {
    // Storage blocked (private mode, sandboxed iframe): an expected non-event,
    // not an operational error, so nothing is reported. English it is.
    return DEFAULT_LANG;
  }
}

// No navigator.language: English is the first-visit default by decision.
export function initialLang(win = globalThis.window) {
  return win ? readLangPref(safeStorage(win)) : DEFAULT_LANG;
}

export function writeLangPref(lang, win = globalThis.window) {
  try {
    const storage = safeStorage(win);
    if (!storage) return false;
    storage.setItem(LANG_KEY, lang);
    return true;
  } catch {
    // Blocked or full storage: the choice holds for this visit only. Expected,
    // so not reported.
    return false;
  }
}
