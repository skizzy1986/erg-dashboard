import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { toDecisions, toHypotheses } from '../utils/coachLog.js';

// The context store's diary + decision record, newest first. coach_log.date is
// a native `date`, so ordering on it is correct (unlike sessions.date). Diary
// rows are filtered out server-side so they cannot crowd decisions out of the
// 200-row window.
export function useCoachLog() {
  const query = useQuery({
    queryKey: ['coach_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_log')
        .select('id, date, entry_type, body, tags, supersedes, created_at')
        .in('entry_type', ['decision', 'observation'])
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const { decisions, hypotheses } = useMemo(() => {
    const rows = query.data ?? [];
    return { decisions: toDecisions(rows), hypotheses: toHypotheses(rows) };
  }, [query.data]);
  return { ...query, decisions, hypotheses };
}
