import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { toISODate } from '../utils/dateFormat.js';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, date, type, label, duration, srpe, status, distance_m, avg_watts, avg_hr'
        )
        // date_iso, not date: sessions.date is TEXT "M/D/YY" and sorts
        // lexically, so a LIMIT over it returns the wrong SET of rows (#187).
        // nullsFirst is mandatory — postgrest-js omits the clause entirely when
        // it is undefined, and Postgres defaults descending to NULLS FIRST,
        // which would float an unparseable date to the top as "most recent".
        // id breaks ties: 24 of 57 dates carry more than one session, so
        // without it the 50-row cut is arbitrary and moves between refetches.
        .order('date_iso', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(50);
      if (error) throw error;
      // A deliberate no-op against the DB order above — keep it. The migration
      // and the deploy are not atomic and PostgREST reloads its schema cache
      // asynchronously, so this covers that window and any rollback.
      return (data ?? []).slice().sort((a, b) => {
        const ai = toISODate(a.date);
        const bi = toISODate(b.date);
        return ai < bi ? 1 : ai > bi ? -1 : 0;
      });
    },
    staleTime: 60_000,
  });
}
