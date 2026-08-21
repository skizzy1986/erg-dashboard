import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { sessionLoad } from '../utils/trainingLoad.js';
import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';
import { useAnchors } from './useAnchors.js';

export function useTSSHistory() {
  const { cp, ftp } = useAnchors();

  const query = useQuery({
    queryKey: ['tss-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('date, duration, srpe, type, avg_watts')
        .in('status', COMPLETED_STATUSES)
        // Not .gt('srpe', 0): that dropped every session without a hand-entered
        // sRPE before it ever reached the client, which is all of the
        // Strava-backfilled history. Keep anything carrying either signal and
        // let sessionLoad decide which one to use.
        .or('srpe.gt.0,avg_watts.gt.0')
        // date_iso, not the lexically-sorting TEXT date (#187). This ordering
        // is a contract, not a correctness requirement: calcTrainingLoad keys a
        // map by date and walks day-by-day, so CTL/ATL/TSB are unaffected by
        // input order. Do not re-file the old ordering as a CTL bug.
        .order('date_iso', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Derived outside the queryFn so a revalidated CP/FTP anchor recomputes the
  // whole series without a refetch.
  const data = useMemo(
    () =>
      (query.data ?? []).map((s) => ({
        date: s.date,
        tss: sessionLoad(s, { cp, ftp }),
      })),
    [query.data, cp, ftp]
  );

  return { ...query, data };
}
