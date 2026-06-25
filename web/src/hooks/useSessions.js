import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, date, type, label, duration, srpe, status, distance_m, avg_watts, avg_hr'
        )
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
