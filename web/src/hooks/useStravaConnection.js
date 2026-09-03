import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { describeConnection } from '../utils/stravaStatus.js';

// `strava_sync_state` holds one row per user and is readable by the browser
// through a select-only owner policy. No row means never connected — .maybeSingle()
// so that resolves to null instead of rejecting.
//
// A FAILED READ IS NOT "not connected". `status`/`statusKind` are null while
// isError is true, so the panel cannot render a Connect button over what is
// actually a broken query and silently invite a second OAuth round-trip.
const COLUMNS = [
  'connected',
  'athlete_id',
  'scope',
  'connected_at',
  'disconnected_at',
  'backfill_from',
  'backfill_complete',
  'last_run_at',
  'last_run_mode',
  'last_run_status',
  'last_error_code',
  'imported_total',
  'adopted_total',
  'skipped_total',
  'failed_total',
  'ambiguous_activity_ids',
  'rate_limit_resets_at',
  'updated_at',
].join(', ');

export function useStravaConnection() {
  const query = useQuery({
    queryKey: ['strava', 'connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strava_sync_state')
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 30_000,
  });

  const connection = query.data ?? null;
  const status = query.isError ? null : describeConnection(connection);

  return {
    ...query,
    connection,
    isConnected: connection?.connected === true,
    status,
    statusKind: status?.kind ?? null,
  };
}
