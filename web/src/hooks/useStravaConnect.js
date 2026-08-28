import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// The browser NEVER calls Strava directly. `strava-connect` builds the
// authorize URL server-side (it is the only side that holds the client secret)
// and the whole of the Strava interaction here is one top-level navigation to
// the URL it returns. No fetch, no Strava host literal and no build-time Strava
// env var appears anywhere under src/ — a CSP guarantee depends on that staying
// true, and a test in useStravaConnect.test.jsx enforces it.
export const DISCONNECT_CONFIRM =
  'Disconnect Strava? Future activities will stop importing. Sessions already imported are never deleted — they stay in your log.';

export function useStravaConnect() {
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationKey: ['strava', 'connect', 'start'],
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'strava-connect',
        { body: { action: 'start' } }
      );
      if (error) throw error;
      // The spec pins `authorize_url`; the edge function as written returns
      // `url`. Both are accepted so the flow works whichever name settles —
      // FLAGGED FOR REVIEW: pick one and delete the other, do not leave two.
      const authorizeUrl = data?.authorize_url ?? data?.url;
      if (!authorizeUrl) {
        throw new Error('strava-connect returned no authorize url');
      }
      return authorizeUrl;
    },
    onSuccess: (authorizeUrl) => {
      window.location.href = authorizeUrl;
    },
  });

  const disconnect = useMutation({
    mutationKey: ['strava', 'connect', 'disconnect'],
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'strava-connect',
        { body: { action: 'disconnect' } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strava', 'connection'] });
    },
  });

  // The confirm lives with the mutation, not in the panel, so the promise that
  // imported sessions survive is made in exactly one place.
  const requestDisconnect = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm(DISCONNECT_CONFIRM)) {
      return;
    }
    disconnect.mutate();
  }, [disconnect]);

  return { start, disconnect, requestDisconnect };
}
