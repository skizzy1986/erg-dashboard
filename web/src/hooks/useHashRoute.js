import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_DESTINATION,
  isDestination,
} from '../constants/destinations.js';

// Hash, not history. Capacitor serves the app from file:// on Android, where
// pushState paths do not resolve — DESIGN_BRIEF.md §8.2. A hash also survives
// a reload and makes a destination linkable.
const read = () => {
  const id = (window.location.hash || '').replace(/^#\/?/, '');
  return isDestination(id) ? id : DEFAULT_DESTINATION;
};

export function useHashRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Set the state and write the hash. Relying on the hashchange event alone
  // would work — it is what handles a hash changed from outside — but the
  // event is delivered asynchronously, so a tab press would lag its own tap by
  // a tick. Setting to a value already held is a no-op, so the echo is free.
  const navigate = useCallback((id) => {
    if (!isDestination(id)) return;
    setRoute(id);
    if (read() !== id) window.location.hash = `#/${id}`;
  }, []);

  return [route, navigate];
}
