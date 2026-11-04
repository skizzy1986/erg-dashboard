import { useCallback, useEffect, useState } from 'react';
import {
  DARK_QUERY,
  THEME_KEY,
  THEME_PREFS,
  readThemePref,
  resolveTheme,
  safeStorage,
} from '../../utils/squatTheme.js';

export { THEME_KEY, THEME_PREFS };

const darkQuery = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : null;

// The tool's light/dark choice. Defaults to the OS preference; an explicit
// choice persists. The caller puts `resolved` on the tool root as data-theme —
// the palette is emitted at :root (light) and under [data-theme='dark'], so
// that one attribute switches every THEME token beneath it. RouteRoot resolves
// the same way (utils/squatTheme.js) so the loading ground matches.
export function useSquatTheme() {
  const [preference, setPreferenceState] = useState(() =>
    readThemePref(safeStorage(window))
  );
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

  return {
    preference,
    resolved: resolveTheme(preference, systemDark),
    setPreference,
  };
}
