import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { COMPLETED_STATUSES } from '../constants/sessionStatus.js';

// No .limit() — deliberately. useSessions() pairs .limit(50) with an
// .order('date', desc) on a TEXT MM/DD/YY column, which sorts lexically
// ('12/1/26' < '7/1/26'), so its 50 rows are effectively arbitrary. A
// benchmark session outside that slice would produce a false OVERDUE — the
// exact failure this feature exists to prevent. The status filter keeps the
// full result to a few kB.
export function useBenchmarkSessions() {
  return useQuery({
    queryKey: ['benchmark-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, label, status')
        .in('status', COMPLETED_STATUSES)
        .order('id', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
