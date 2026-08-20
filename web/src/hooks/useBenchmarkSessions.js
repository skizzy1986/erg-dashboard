import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// Scoped read for the benchmark badges. The key is a CHILD of ['sessions'], so
// the existing invalidateQueries({ queryKey: ['sessions'] }) calls in
// LogSessionForm and ErgLiveView (neither passes `exact`) refetch it too and a
// freshly-logged test clears its badge without any edit to those files.
//
// limit 500 rather than useSessions()' 50: sessions.date is TEXT, so the
// server-side order is not chronological and a small limit truncates the wrong
// rows. At ~92 rows today, 500 returns the whole table and set membership stops
// depending on the broken sort. The resolver filters by date itself.
export function useBenchmarkSessions() {
  return useQuery({
    queryKey: ['sessions', 'benchmark-window'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, label, status')
        .order('date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
