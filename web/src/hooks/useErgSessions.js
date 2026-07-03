import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { wattsToPace500, formatPace, classifyZone } from '../utils/pace.js';
import { useAnchors } from './useAnchors.js';

export function enrich(s, cp) {
  let pace_500m = null;
  if (s.avg_watts) {
    pace_500m = wattsToPace500(s.avg_watts);
  } else if (s.distance_m && s.duration) {
    const secs = parseFloat(s.duration) * 60;
    pace_500m = secs / (s.distance_m / 500);
  }
  const [month, day] = (s.date || '').split('-').slice(1);
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
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const data = useMemo(
    () => (query.data ?? []).map((s) => enrich(s, cp)),
    [query.data, cp]
  );

  return { ...query, data };
}
