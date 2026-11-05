import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { captureError } from '../utils/sentry.js';
import {
  listNiggles,
  parseJsonAnchor,
  validateDayPlan,
  validateNutritionTargets,
} from '../utils/anchorValues.js';

// anchors.value is text (mixed KV store) — cast + validate before any numeric use.
function toNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Live athlete anchors — the single source of truth for calibration values,
// targets and plans. Reads the current row per key (superseded_at IS NULL). No
// hardcoded fallback: when a value is missing/unreachable, the resolved value is
// null and callers degrade explicitly (never silently reuse a stale constant).
export function useAnchors() {
  const query = useQuery({
    queryKey: ['anchors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anchors')
        .select('key, value, unit, status, source, valid_from, note')
        .is('superseded_at', null);
      if (error) throw error;
      const byKey = {};
      for (const row of data ?? []) byKey[row.key] = row;
      return byKey;
    },
    staleTime: 60_000,
  });

  const anchors = useMemo(() => query.data ?? {}, [query.data]);
  const rowingCp = anchors.rowing_cp ?? null;
  const bikeFtp = anchors.bike_ftp ?? null;
  const hrMaxRow = anchors.hr_max_working ?? null;
  const cp = toNum(rowingCp?.value);
  const ftp = toNum(bikeFtp?.value);
  const hrMax = toNum(hrMaxRow?.value);

  const parsed = useMemo(() => {
    const targets = parseJsonAnchor(
      anchors.nutrition_targets,
      validateNutritionTargets
    );
    const maintenance = parseJsonAnchor(
      anchors.maintenance_plan,
      validateDayPlan
    );
    const deficit = parseJsonAnchor(anchors.deficit_plan, validateDayPlan);
    return {
      niggles: listNiggles(anchors),
      nutritionTargets: targets.value,
      maintenancePlan: maintenance.value,
      deficitPlan: deficit.value,
      parseErrors: [targets.error, maintenance.error, deficit.error].filter(
        Boolean
      ),
    };
  }, [anchors]);

  // A malformed JSON anchor renders as "not set" — reported once per message so
  // a re-render does not flood Sentry with the same defect.
  const reported = useRef(new Set());
  useEffect(() => {
    for (const err of parsed.parseErrors) {
      if (reported.current.has(err.message)) continue;
      reported.current.add(err.message);
      captureError(err, { source: 'useAnchors', op: 'parseJsonAnchor' });
    }
  }, [parsed.parseErrors]);

  return {
    ...query,
    anchors,
    cp,
    cpStatus: rowingCp?.status ?? null,
    cpAvailable: cp != null,
    ftp,
    ftpStatus: bikeFtp?.status ?? null,
    hrMax,
    hrMaxStatus: hrMaxRow?.status ?? null,
    ...parsed,
  };
}
