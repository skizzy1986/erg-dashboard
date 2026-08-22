import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { wattsToPace500, formatPace, classifyZone } from '../utils/pace.js';
import { toISODate } from '../utils/dateFormat.js';
import { useAnchors } from './useAnchors.js';

export function enrich(s, cp) {
  let pace_500m = null;
  if (s.avg_watts) {
    pace_500m = wattsToPace500(s.avg_watts);
  } else if (s.distance_m && s.duration) {
    const secs = parseFloat(s.duration) * 60;
    pace_500m = secs / (s.distance_m / 500);
  }
  const [, month, day] = toISODate(s.date).split('-');
  return {
    ...s,
    pace_500m,
    pace_500m_str: formatPace(pace_500m),
    zone: classifyZone(s.avg_watts, cp),
    hardPush: s.srpe != null && s.srpe >= 7,
    date_display: month && day ? `${parseInt(month)}/${parseInt(day)}` : s.date,
  };
}

export function useErgSessions() {
  // Zone classification keys off live Critical Power (anchors.rowing_cp).
  const { cp } = useAnchors();
  const query = useQuery({
    queryKey: ['erg-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, date, type, label, duration, srpe, status, distance_m, avg_watts, avg_hr'
        )
        .eq('type', 'erg')
        .eq('status', 'logged')
        // date_iso, not date: sessions.date is TEXT "M/D/YY" and sorts lexically, so
        // a LIMIT over it returns the wrong SET of rows (#187). nullsFirst is
        // mandatory — postgrest-js omits the clause entirely when it is undefined,
        // and Postgres defaults descending to NULLS FIRST, which would float an
        // unparseable date to the top as "most recent".
        // id breaks ties: the PM5 save path suffixes the label with hh:mm so two
        // sessions can share a date, and without it the 50-row cut is arbitrary and
        // moves between refetches.
        .order('date_iso', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // enrich() derives pace/zone/date_display; the sort is defence, not
  // correctness — the query above already returns date_iso order, and
  // toISODate() accepts exactly the shapes session_date_to_iso() does. Keep it:
  // the map is here anyway, and it holds ordering through a rollback or the
  // window where PostgREST has not reloaded its schema cache.
  const data = useMemo(
    () =>
      (query.data ?? [])
        .map((s) => enrich(s, cp))
        .sort((a, b) => {
          const ai = toISODate(a.date);
          const bi = toISODate(b.date);
          return ai < bi ? 1 : ai > bi ? -1 : 0;
        }),
    [query.data, cp]
  );

  return { ...query, data };
}
