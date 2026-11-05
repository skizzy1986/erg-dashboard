import {
  THEME_KEY,
  initialSquatTheme,
  readThemePref,
  resolveTheme,
  safeStorage,
  systemPrefersDark,
} from '../squatTheme.js';

const store = (v) => ({ getItem: (k) => (k === THEME_KEY ? v : null) });
const win = ({ stored, dark, noMatchMedia, storageThrows } = {}) => ({
  get localStorage() {
    if (storageThrows) throw new Error('SecurityError');
    return store(stored ?? null);
  },
  ...(noMatchMedia ? {} : { matchMedia: () => ({ matches: !!dark }) }),
});

describe('squatTheme', () => {
  it('reads only the three valid preferences', () => {
    expect(readThemePref(store('dark'))).toBe('dark');
    expect(readThemePref(store('light'))).toBe('light');
    expect(readThemePref(store('neon'))).toBe('system');
    expect(readThemePref(null)).toBe('system');
    expect(
      readThemePref({
        getItem: () => {
          throw new Error('blocked');
        },
      })
    ).toBe('system');
  });

  it('resolves system against the OS', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('resolves the initial theme from storage, then the OS', () => {
    expect(initialSquatTheme(win({ stored: 'light', dark: true }))).toBe(
      'light'
    );
    expect(initialSquatTheme(win({ dark: true }))).toBe('dark');
    expect(initialSquatTheme(win({ noMatchMedia: true }))).toBe('light');
    expect(initialSquatTheme(win({ storageThrows: true, dark: true }))).toBe(
      'dark'
    );
  });

  it('tolerates a window without matchMedia or storage', () => {
    expect(systemPrefersDark({})).toBe(false);
    expect(safeStorage(win({ storageThrows: true }))).toBeNull();
  });
});
