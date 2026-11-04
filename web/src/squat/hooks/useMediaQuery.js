import { useEffect, useState } from 'react';

// jsdom has no matchMedia; absent the API the query reads false (phone layout).
const query = (q) =>
  typeof window.matchMedia === 'function' ? window.matchMedia(q) : null;

export function useMediaQuery(q) {
  const [matches, setMatches] = useState(() => query(q)?.matches ?? false);
  useEffect(() => {
    const mq = query(q);
    if (!mq) return undefined;
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [q]);
  return matches;
}
