import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// RLS scopes the rows, so there is no user_id filter.
export function useInjuries() {
  const query = useQuery({
    queryKey: ['injuries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('injuries')
        .select('id, region, side, onset_on, resolved_on, status, note')
        .order('onset_on', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
  return { ...query, rows: query.data ?? [] };
}
