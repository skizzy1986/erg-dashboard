import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// Reads only the non-secret token fields (athlete_id, expires_at, scope). The
// access_token / refresh_token columns are never selected and never exposed to
// the client — RLS allows the owner to SELECT, but the app has no need for them.
export function useStravaConnection() {
  return useQuery({
    queryKey: ['strava-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_tokens')
        .select('athlete_id, expires_at, scope')
        .eq('provider', 'strava')
        .maybeSingle();
      if (error) throw error;
      return {
        connected: !!data,
        athleteId: data?.athlete_id ?? null,
        expiresAt: data?.expires_at ?? null,
        scope: data?.scope ?? null,
      };
    },
    staleTime: 60_000,
  });
}
