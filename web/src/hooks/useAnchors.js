import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// anchors.value is text (mixed KV store) — cast + validate before any numeric use.
function toNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Live calibration anchors — the single source of truth for CP/FTP.
// Reads the current row per key (superseded_at IS NULL). No hardcoded fallback:
// when a value is missing/unreachable, the resolved number is null and callers
// degrade explicitly (never silently reuse a stale constant).
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

  const anchors = query.data ?? {};
  const rowingCp = anchors.rowing_cp ?? null;
  const bikeFtp = anchors.bike_ftp ?? null;
  const cp = toNum(rowingCp?.value);
  const ftp = toNum(bikeFtp?.value);

  return {
    ...query,
    anchors,
    cp,
    cpStatus: rowingCp?.status ?? null,
    cpAvailable: cp != null,
    ftp,
    ftpStatus: bikeFtp?.status ?? null,
  };
}
