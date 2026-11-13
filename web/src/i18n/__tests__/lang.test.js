import {
  LANG_KEY,
  LANG_TAG,
  LANG_UI,
  OFFLINE_TEXT,
  ROOT_ERROR_TEXT,
  initialLang,
  readLangPref,
  writeLangPref,
} from '../lang.js';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    data,
  };
};

const throwingStorage = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
};

describe('the language preference', () => {
  afterEach(() => window.localStorage.clear());

  it('is one product-neutral key shared by the dashboard and /squat', () => {
    expect(LANG_KEY).toBe('splitiq.lang');
  });

  it('defaults to English on a first visit, ignoring the browser language', () => {
    const nav = vi.spyOn(window.navigator, 'language', 'get');
    nav.mockReturnValue('es-CO');
    try {
      expect(initialLang(window)).toBe('en');
    } finally {
      nav.mockRestore();
    }
  });

  it('reads a stored choice and rejects anything it does not know', () => {
    expect(readLangPref(memoryStorage({ [LANG_KEY]: 'es' }))).toBe('es');
    expect(readLangPref(memoryStorage({ [LANG_KEY]: 'en' }))).toBe('en');
    expect(readLangPref(memoryStorage({ [LANG_KEY]: 'es-CO' }))).toBe('en');
    expect(readLangPref(memoryStorage({ [LANG_KEY]: 'fr' }))).toBe('en');
    expect(readLangPref(null)).toBe('en');
  });

  it('falls back to English, without throwing, when storage is blocked', () => {
    expect(readLangPref(throwingStorage)).toBe('en');
    const win = {
      get localStorage() {
        throw new Error('SecurityError');
      },
    };
    expect(initialLang(win)).toBe('en');
    expect(writeLangPref('es', win)).toBe(false);
    expect(writeLangPref('es', { localStorage: throwingStorage })).toBe(false);
    expect(initialLang(undefined)).toBe('en');
  });

  it('persists a choice for the next load', () => {
    expect(writeLangPref('es', window)).toBe(true);
    expect(window.localStorage.getItem(LANG_KEY)).toBe('es');
    expect(initialLang(window)).toBe('es');
  });

  it('tags Spanish as es-CO', () => {
    expect(LANG_TAG).toEqual({ en: 'en', es: 'es-CO' });
  });

  it('has both languages for every pre-chunk string', () => {
    for (const table of [
      OFFLINE_TEXT,
      ROOT_ERROR_TEXT.heading,
      ROOT_ERROR_TEXT.body,
      ROOT_ERROR_TEXT.retry,
      LANG_UI.label,
      LANG_UI.native,
      LANG_UI.switchTo,
    ]) {
      expect(table.en).toBeTruthy();
      expect(table.es).toBeTruthy();
    }
  });

  it('keeps the visible code at the start of the cycle button name (WCAG 2.5.3)', () => {
    expect(LANG_UI.switchTo.en).toContain('(EN)');
    expect(LANG_UI.switchTo.es).toContain('(ES)');
  });
});
