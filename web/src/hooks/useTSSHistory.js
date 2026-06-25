import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

export function useTSSHistory() {
  return useQuery({
    queryKey: ['tss-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('date, duration, srpe')
        .eq('status', 'logged')
        .gt('srpe', 0)
        .gt('duration', 0)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        date: s.date,
        tss: Math.round((s.duration * s.srpe) / 60),
      }));
    },
    staleTime: 300_000,
  });
}
