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
      // Sum TSS per day: multiple logged sessions on the same date must be
      // combined. calcTrainingLoad keys its daily map by date, so emitting one
      // row per session would let a later session overwrite an earlier one and
      // silently drop that day's load. Sum raw, then round once.
      const byDate = {};
      for (const s of data ?? []) {
        byDate[s.date] = (byDate[s.date] ?? 0) + (s.duration * s.srpe) / 60;
      }
      return Object.entries(byDate)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, tss]) => ({ date, tss: Math.round(tss) }));
    },
    staleTime: 300_000,
  });
}
