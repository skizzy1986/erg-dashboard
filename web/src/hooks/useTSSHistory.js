import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { parseDurationMinutes } from '../utils/duration.js';
import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';

export function useTSSHistory() {
  return useQuery({
    queryKey: ['tss-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('date, duration, srpe')
        .in('status', COMPLETED_STATUSES)
        .gt('srpe', 0)
        // date_iso, not the lexically-sorting TEXT date (#187). This ordering
        // is a contract, not a correctness requirement: calcTrainingLoad keys a
        // map by date and walks day-by-day, so CTL/ATL/TSB are unaffected by
        // input order. Do not re-file the old ordering as a CTL bug.
        .order('date_iso', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        date: s.date,
        tss: Math.round((parseDurationMinutes(s.duration) * s.srpe) / 60),
      }));
    },
    staleTime: 300_000,
  });
}
