import { useCallback, useEffect, useState } from 'react';

export const THEME_KEY = 'splitiq.theme';
export const THEME_PREFS = ['system', 'light', 'dark'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readPref() {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return THEME_PREFS.includes(v) ? v : 'system';
  } catch {
    // Storage blocked (private mode, sandboxed iframe): follow the OS.
    return 'system';
  }
}

const darkQuery = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null;

// The tool's light/dark choice. Defaults to the OS preference; an explicit
// choice persists. The caller puts `resolved` on the tool root as data-theme —
// the palette is emitted at :root (light) and under [data-theme='dark'], so
// that one attribute switches every THEME token beneath it.
export function useSquatTheme() {
  const [preference, setPreferenceState] = useState(readPref);
  const [systemDark, setSystemDark] = useState(
    () => darkQuery()?.matches ?? false
  );

  useEffect(() => {
    const mq = darkQuery();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((next) => {
    if (!THEME_PREFS.includes(next)) return;
    setPreferenceState(next);
    try {
      if (next === 'system') window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }, []);

  const resolved =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  return { preference, resolved, setPreference };
}
