import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

const RHR_BASELINE = 57;
const HRV_BASELINE = 30;

function computeReadiness(latest) {
  if (!latest) return { readinessScore: 0, readinessLabel: 'FATIGUED' };
  let score = 100;
  score -= Math.max(0, latest.rhr - RHR_BASELINE) * 4;
  score -= Math.max(0, HRV_BASELINE - latest.hrv) * 1.5;
  score -= latest.sleep < 7 ? (7 - latest.sleep) * 8 : 0;
  const readinessScore = Math.round(Math.min(100, Math.max(0, score)));
  const readinessLabel =
    readinessScore >= 80
      ? 'READY'
      : readinessScore >= 60
        ? 'CAUTION'
        : 'FATIGUED';
  return { readinessScore, readinessLabel };
}

export function useVitals() {
  const query = useQuery({
    queryKey: ['vitals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals')
        .select('date, rhr, hrv, sleep, sleep_score')
        .order('date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const latest = query.data?.[0] ?? null;
  const { readinessScore, readinessLabel } = computeReadiness(latest);

  return {
    ...query,
    latest,
    readinessScore,
    readinessLabel,
  };
}
