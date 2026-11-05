import { useCallback, useEffect, useState } from 'react';
import { formatSquatHash, parseSquatHash } from '../../utils/squatRoute.js';

// Deep-link state (#guide=…&t=…&tab=…&paused) as React state. Updates replace
// the history entry rather than pushing one, so opening and closing the guide
// does not turn the Back button into an undo stack.
export function useSquatHashState() {
  const [state, setState] = useState(() =>
    parseSquatHash(window.location.hash)
  );

  useEffect(() => {
    const onHash = () => setState(parseSquatHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const hash = formatSquatHash(next);
      const { pathname, search } = window.location;
      window.history.replaceState(
        window.history.state,
        '',
        `${pathname}${search}${hash}`
      );
      return next;
    });
  }, []);

  return [state, update];
}
