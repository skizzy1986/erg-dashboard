import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_DESTINATION,
  isDestination,
} from '../constants/destinations.js';

// Hash, not history. Capacitor serves the app from file:// on Android, where
// pushState paths do not resolve — DESIGN_BRIEF.md §8.2. A hash also survives
// a reload and makes a destination linkable.
//
// `screens` are routes the shell can show that are not destinations (Settings):
// reachable by hash and by back, but never drawn in the tab bar.
const read = (screens) => {
  const id = (window.location.hash || '').replace(/^#\/?/, '');
  return isDestination(id) || screens.includes(id) ? id : DEFAULT_DESTINATION;
};

const NONE = [];

// `initial` overrides the hash for the first render only, for a caller that
// knows better than the URL (the Strava callback, which arrives with no hash).
export function useHashRoute(screens = NONE, initial = null) {
  const [route, setRoute] = useState(() => initial ?? read(screens));

  useEffect(() => {
    const onChange = () => setRoute(read(screens));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [screens]);

  // Set the state and write the hash. Relying on the hashchange event alone
  // would work — it is what handles a hash changed from outside — but the
  // event is delivered asynchronously, so a tab press would lag its own tap by
  // a tick. Setting to a value already held is a no-op, so the echo is free.
  const navigate = useCallback(
    (id) => {
      if (!isDestination(id) && !screens.includes(id)) return;
      setRoute(id);
      if (read(screens) !== id) window.location.hash = `#/${id}`;
    },
    [screens]
  );

  return [route, navigate];
}
