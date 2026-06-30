import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

export function useStravaSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('strava-sync');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['strava-connection'] });
    },
  });
}
