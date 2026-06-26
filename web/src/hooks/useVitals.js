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
        .select('date, rhr, hrv, sleep, sleep_score, bodyweight')
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
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
