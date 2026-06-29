import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import {
  computeReadiness,
  computePersonalBaselines,
  computeReadinessHistory,
} from '../utils/recoveryAnalytics.js';

export function useVitals() {
  const query = useQuery({
    queryKey: ['vitals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals')
        .select('date, rhr_bpm, hrv_ms, sleep_hours, bodyweight_kg')
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: r.date,
        rhr: r.rhr_bpm,
        hrv: r.hrv_ms,
        sleep: r.sleep_hours != null ? Number(r.sleep_hours) : null,
        bodyweight: r.bodyweight_kg != null ? Number(r.bodyweight_kg) : null,
      }));
    },
    staleTime: 60_000,
  });

  const rows = query.data ?? [];
  const latest = rows[0] ?? null;
  const personalBaselines = computePersonalBaselines(rows);
  const { readinessScore, readinessLabel } = computeReadiness(
    latest,
    personalBaselines
  );
  const vitalsHistory = rows.slice().reverse();
  const history = computeReadinessHistory(rows, personalBaselines);
  const hasPersonalBaselines = rows.length >= 14;

  return {
    ...query,
    latest,
    readinessScore,
    readinessLabel,
    personalBaselines,
    vitalsHistory,
    history,
    hasPersonalBaselines,
  };
}
