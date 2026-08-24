import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// jsdom ships no window.matchMedia at all, so an unguarded read throws in every
// test that mounts a component using this. Absent the API, assume motion is fine.
function reducedMotionQuery() {
  if (typeof window === 'undefined') return null;
  if (typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(QUERY);
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => reducedMotionQuery()?.matches ?? false
  );

  useEffect(() => {
    const mq = reducedMotionQuery();
    if (!mq) return undefined;
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
