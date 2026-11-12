import { useCallback, useEffect, useState } from 'react';
import { formatSquatHash, parseSquatHash } from '../utils/squatHash.js';

// Deep-link state (#guide=…&t=…&tab=…&paused) as React state. Updates replace
// the history entry rather than pushing one, so opening and closing the guide
// does not turn the Back button into an undo stack.
//
// `arrival` counts navigations INTO the page (a pasted link, a hand edit): 0
// at mount, +1 per hashchange. replaceState never fires hashchange, so the
// tool's own writes never count, and a consumer that re-applies the whole
// link on a new arrival cannot be fed its own output back.
export function useSquatHashState() {
  const [state, setState] = useState(() =>
    parseSquatHash(window.location.hash)
  );
  const [arrival, setArrival] = useState(0);

  useEffect(() => {
    const onHash = () => {
      setState(parseSquatHash(window.location.hash));
      setArrival((n) => n + 1);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Called on every camera gesture (clear-on-change), so a patch that changes
  // nothing returns the same state object, which React skips re-rendering,
  // and writes nothing. Idempotent, so StrictMode's doubled updater is safe.
  const update = useCallback((patch) => {
    setState((prev) => {
      if (Object.keys(patch).every((k) => Object.is(prev[k], patch[k]))) {
        return prev;
      }
      const next = { ...prev, ...patch };
      const hash = formatSquatHash(next);
      const { pathname, search, hash: current } = window.location;
      if (hash !== (current === '#' ? '' : current)) {
        window.history.replaceState(
          window.history.state,
          '',
          `${pathname}${search}${hash}`
        );
      }
      return next;
    });
  }, []);

  return [state, update, arrival];
}
