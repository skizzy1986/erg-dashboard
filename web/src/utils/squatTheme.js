// The squat tool's light/dark resolution, shared by useSquatTheme and by
// RouteRoot's Suspense fallback. It lives outside src/squat/ because RouteRoot
// runs at first paint: the fallback has to paint the right ground before the
// tool's chunk has loaded, and importing that chunk to find out would defeat
// the lazy split.

export const THEME_KEY = 'splitiq.theme';
export const THEME_PREFS = ['system', 'light', 'dark'];
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readThemePref(storage) {
  try {
    const v = storage?.getItem(THEME_KEY);
    return THEME_PREFS.includes(v) ? v : 'system';
  } catch {
    // Storage blocked (private mode, sandboxed iframe): follow the OS.
    return 'system';
  }
}

export function systemPrefersDark(win) {
  return typeof win?.matchMedia === 'function'
    ? win.matchMedia(DARK_QUERY).matches
    : false;
}

export const resolveTheme = (preference, systemDark) =>
  preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

export function safeStorage(win) {
  try {
    return win.localStorage;
  } catch {
    // Accessing localStorage itself throws when storage is disabled.
    return null;
  }
}

export function initialSquatTheme(win = window) {
  return resolveTheme(readThemePref(safeStorage(win)), systemPrefersDark(win));
}
