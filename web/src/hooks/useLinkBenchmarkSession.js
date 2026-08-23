import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { invalidateSessionQueries } from '../utils/invalidateSessionQueries.js';

// Moves a benchmark's link onto a session, or clears it. CLEAR THEN SET, never
// the reverse: sessions_one_session_per_benchmark is a partial unique index on
// (user_id, benchmark_key), so writing the new holder while the incumbent still
// carries the key is a guaranteed 23505.
//
// Call with sessionId == null to unlink: step 1 alone is the whole operation.
//
// The two statements are NOT atomic. A failure between them leaves the
// benchmark unlinked and its badge back to overdue — the safe direction, since
// it can never produce a false-done, and re-running the link fixes it. A
// single-user app does not need an RPC for this.
//
// Neither statement names user_id: sessions_update_own carries both USING and
// WITH CHECK on auth.uid() = user_id, so RLS narrows both .eq() filters and a
// cross-user write is impossible.
export function useLinkBenchmarkSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ benchmarkKey, sessionId }) => {
      const cleared = await supabase
        .from('sessions')
        .update({ benchmark_key: null })
        .eq('benchmark_key', benchmarkKey);
      if (cleared.error) throw cleared.error;
      if (sessionId == null) return;

      const claimed = await supabase
        .from('sessions')
        .update({ benchmark_key: benchmarkKey })
        .eq('id', sessionId);
      if (claimed.error) throw claimed.error;
    },
    // onSettled, not onSuccess: step 1 can succeed and step 2 fail, which nulls
    // the key in the database while the cached payload still names the old
    // holder. Invalidating only on success would leave the badge reading done
    // against a row that no longer carries the key — the one direction this
    // design promises it can never produce.
    onSettled: () => {
      invalidateSessionQueries(queryClient);
    },
  });
}
