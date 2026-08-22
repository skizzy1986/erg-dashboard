import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// Scoped read for the benchmark badges. The key is a CHILD of ['sessions'], so
// the existing invalidateQueries({ queryKey: ['sessions'] }) calls in
// LogSessionForm and ErgLiveView (neither passes `exact`) refetch it too and a
// freshly-logged test clears its badge without any edit to those files.
//
// limit 500 rather than useSessions()' 50 because the ladder resolver wants the
// whole benchmark history, not a recency window: it searches back from each
// event's own date, so a 50-row cut would hide older attempts. At 92 rows today
// the limit never binds; ordering by date_iso makes the cut "the most recent
// 500" if it ever does. The resolver filters by date itself and is
// order-independent, so no id tiebreaker is needed here.
export function useBenchmarkSessions() {
  return useQuery({
    queryKey: ['sessions', 'benchmark-window'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, label, status')
        .order('date_iso', { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
