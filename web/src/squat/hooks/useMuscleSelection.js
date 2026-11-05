import { useCallback, useEffect, useMemo, useState } from 'react';
import { STALE_LINK } from '../constants/activationBands.js';
import { findBySlug } from '../utils/muscleIndex.js';

/**
 * Which muscle the page is showing, derived from `#m=<slug>`. The hash is the
 * single source of truth — there is no second copy in component state, so a
 * shared link, a Back press and a click all take the same path.
 *
 * Selection is URL state, which is exactly why it is not in
 * useAnatomyViewState: depth, direction and layers deliberately leave the hash
 * empty, and SquatScene.test.jsx pins that.
 */
export function useMuscleSelection({ index, hash, setHash }) {
  const slug = hash.m;
  // While the manifest is still loading there is nothing to resolve against,
  // so the slug is HELD rather than cleared — clearing it here is how a deep
  // link destroys itself on the first render.
  const loading = !index.all.length;
  const muscle = useMemo(
    () => (loading ? null : findBySlug(index, slug)),
    [index, slug, loading]
  );
  const stale = !loading && !!slug && !muscle;

  // Remembered, not derived: the message has to outlive the very hash update
  // below that removes the dead link. Adjusted during render rather than in an
  // effect, so it is already on screen for the first paint that notices.
  const [dead, setDead] = useState(null);
  if (stale && dead !== slug) setDead(slug);

  // A dead link is dropped so it does not survive a reload or get re-shared.
  useEffect(() => {
    if (stale) setHash({ m: null });
  }, [stale, setHash]);

  const select = useCallback(
    (next) => {
      setDead(null);
      setHash({ m: next ?? null });
    },
    [setHash]
  );
  const clear = useCallback(() => select(null), [select]);

  return {
    slug,
    muscle,
    select,
    clear,
    notice: dead ? STALE_LINK : null,
  };
}
