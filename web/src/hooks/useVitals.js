import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import {
  computeReadiness,
  computePersonalBaselines,
  computeReadinessHistory,
} from '../utils/recoveryAnalytics.js';
import { calcTrainingLoad } from '../utils/trainingLoad.js';
import { useTSSHistory } from './useTSSHistory.js';

export function useVitals() {
  // Readiness carries a TSB term, so it needs the load series. Sourced here
  // rather than passed in by every caller, so there is exactly one readiness
  // number per day and desktop and mobile cannot drift apart again. Shares
  // useTSSHistory's query key, so react-query serves it from cache.
  const { data: tssHistory } = useTSSHistory();

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
  const loadData = tssHistory?.length ? calcTrainingLoad(tssHistory) : [];
  const tsbNow = loadData[loadData.length - 1]?.tsb ?? null;
  const readiness = computeReadiness(latest, personalBaselines, tsbNow);
  const vitalsHistory = rows.slice().reverse();
  const history = computeReadinessHistory(rows, personalBaselines);
  // True only when BOTH baselines are actually personal — it used to be
  // `rows.length >= 14`, which is a count of rows, not of usable readings, so
  // it read true while a metric was still on its population default.
  const hasPersonalBaselines =
    personalBaselines.rhrPersonal && personalBaselines.hrvPersonal;

  return {
    ...query,
    latest,
    // The full result: { score, status, color, partial }. `score` is null when
    // there is nothing to score — callers must not render it as a number.
    readiness,
    // Legacy aliases kept so existing call sites do not churn.
    readinessScore: readiness.score,
    readinessLabel: readiness.status,
    personalBaselines,
    tsbNow,
    vitalsHistory,
    history,
    hasPersonalBaselines,
  };
}
