import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

const toNum = (v) => (v == null ? null : Number(v));

// One query feeds both the lipid and the hormone card; utils/healthRecords.js
// splits it by panel. RLS scopes the rows, so there is no user_id filter.
export function useLabResults() {
  const query = useQuery({
    queryKey: ['lab_results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_results')
        .select(
          'id, collected_on, panel, marker, value, value_qualifier, unit, ref_low, ref_high, ref_source, note'
        )
        .order('collected_on', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        value: toNum(r.value),
        ref_low: toNum(r.ref_low),
        ref_high: toNum(r.ref_high),
      }));
    },
    staleTime: 5 * 60_000,
  });
  return { ...query, rows: query.data ?? [] };
}
