import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

const toNum = (v) => (v == null ? null : Number(v));

// Written out of band (MCP) and rarely, so a long staleTime costs nothing.
// No user_id filter: RLS scopes the rows to the signed-in owner.
export function useBpReadings() {
  const query = useQuery({
    queryKey: ['bp_readings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bp_readings')
        .select(
          'id, measured_at, sys_mmhg, dia_mmhg, pulse_bpm, context, clean'
        )
        .order('measured_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        sys_mmhg: toNum(r.sys_mmhg),
        dia_mmhg: toNum(r.dia_mmhg),
        pulse_bpm: toNum(r.pulse_bpm),
      }));
    },
    staleTime: 5 * 60_000,
  });
  return { ...query, rows: query.data ?? [] };
}
