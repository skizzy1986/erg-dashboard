import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// Blood-pressure readings (bp_readings, single-owner RLS), newest first.
export function useBpReadings() {
  const query = useQuery({
    queryKey: ['bp_readings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bp_readings')
        .select('measured_at, sys_mmhg, dia_mmhg, pulse_bpm, context, clean')
        .order('measured_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        measuredAt: r.measured_at,
        sys: r.sys_mmhg,
        dia: r.dia_mmhg,
        pulse: r.pulse_bpm,
        context: r.context ?? '',
        clean: !!r.clean,
      }));
    },
    staleTime: 60_000,
  });
  return { ...query, readings: query.data ?? [] };
}
