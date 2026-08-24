import { useEffect, useRef, useState } from 'react';

export const SPLASH_MIN_MS = 700;
export const SPLASH_MAX_MS = 5000;

// Owns the whole splash timing decision so main.jsx (coverage-excluded) holds
// nothing but composition. Plain booleans in, one boolean out — no react-query,
// no Supabase, no DOM.
export function useSplashGate({
  enabled = false,
  authResolved = false,
  authFailed = false,
  dataReady = false,
  dataExpected = false,
} = {}) {
  const [floorElapsed, setFloorElapsed] = useState(false);
  const [ceilingReached, setCeilingReached] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const armedRef = useRef(null);

  const active = enabled && !authFailed;

  useEffect(() => {
    if (!active) return undefined;
    // The latch fixes t=0 at first activation and never moves. Re-running this
    // effect (a viewport crossing 767px, or StrictMode's double-invoked mount)
    // re-arms with the REMAINING time rather than restarting the clock.
    if (armedRef.current === null) armedRef.current = Date.now();
    const elapsed = Date.now() - armedRef.current;
    const floor = setTimeout(
      () => setFloorElapsed(true),
      Math.max(0, SPLASH_MIN_MS - elapsed)
    );
    const ceiling = setTimeout(
      () => setCeilingReached(true),
      Math.max(0, SPLASH_MAX_MS - elapsed)
    );
    return () => {
      clearTimeout(floor);
      clearTimeout(ceiling);
    };
  }, [active]);

  // With no session no query ever runs, so dataReady would never latch and a
  // signed-out boot would sit at the ceiling before showing Login.
  const booted = authResolved && (dataReady || !dataExpected);
  const visible =
    enabled && !authFailed && !ceilingReached && (!floorElapsed || !booted);

  // Monotonic latch, set during render (React's documented way to remember
  // something across renders without an effect). `visible` is not naturally
  // monotonic: signing in flips dataExpected false→true, which would otherwise
  // re-show the splash over an app that is already running.
  if (!visible && !dismissed) setDismissed(true);

  return visible && !dismissed;
}
