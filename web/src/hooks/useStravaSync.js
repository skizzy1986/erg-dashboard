import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { invalidateSessionQueries } from '../utils/invalidateSessionQueries.js';

// Same shape as useVitalsSync: a thin mutation over an edge function, with the
// cache invalidation the write implies.
//
// `onSynced` is not redundant with the invalidation. useSessionLog reads
// sessions through a raw useState/useEffect fetch that no react-query
// invalidation can reach (#194), so without the callback newly imported Strava
// sessions would not appear until a manual reload.
export function useStravaSync({ onSynced } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['strava', 'sync'],
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('strava-sync', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['strava', 'connection'] });
      invalidateSessionQueries(queryClient);
      onSynced?.(data);
    },
  });
}
