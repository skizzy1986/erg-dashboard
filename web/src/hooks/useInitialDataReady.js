import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// True once the first round of queries has settled. Subscribes to the query
// cache rather than using useIsFetching() because that would re-render the whole
// app tree on every background refetch for the life of the session; this
// subscription tears itself down permanently the moment it latches.
export function useInitialDataReady() {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    const cache = queryClient.getQueryCache();
    let started = false;
    const check = () => {
      const all = cache.getAll();
      if (all.some((q) => q.state.fetchStatus === 'fetching')) {
        started = true;
        return;
      }
      // The second disjunct covers a warm PWA cache serving instantly (nothing
      // is ever observed 'fetching') and a first fetch that errored — an error
      // settles to status 'error', which must clear the splash, not hold it.
      if (started || all.some((q) => q.state.status !== 'pending')) {
        setReady(true);
      }
    };
    check();
    return cache.subscribe(check);
  }, [queryClient, ready]);

  return ready;
}
