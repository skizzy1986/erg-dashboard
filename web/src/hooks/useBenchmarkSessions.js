import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// Scoped read for the benchmark badges. The key is a CHILD of ['sessions'], so
// the existing invalidateQueries({ queryKey: ['sessions'] }) calls in
// LogSessionForm and ErgLiveView (neither passes `exact`) refetch it too and a
// freshly-linked test clears its badge without any edit to those files.
//
// limit 500 rather than useSessions()' 50 because the ladder resolver wants the
// whole benchmark history, not a recency window: the planned pass searches
// forward from today and a 50-row cut would hide older attempts. At 92 rows
// today the limit never binds; ordering by date_iso makes the cut "the most
// recent 500" if it ever does. Both passes are order-independent — the link
// pass keys on benchmark_key with a lowest-id tie-break, the planned pass picks
// the earliest ISO date — so no id tiebreaker is needed here.
export function useBenchmarkSessions() {
  return useQuery({
    queryKey: ['sessions', 'benchmark-window'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, label, status, benchmark_key')
        .order('date_iso', { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
