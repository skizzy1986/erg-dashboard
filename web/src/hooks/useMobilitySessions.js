import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

// Mobility work is logged as `sessions` rows with type='mobility'. Ordered by the
// generated date_iso — the text `date` column sorts lexically, not by day.
export function useMobilitySessions() {
  const query = useQuery({
    queryKey: ['sessions', 'mobility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, label, duration, coach_note')
        .eq('type', 'mobility')
        .order('date_iso', { ascending: false, nullsFirst: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        label: r.label ?? 'Mobility',
        duration: r.duration ?? '',
        note: r.coach_note ?? '',
      }));
    },
    staleTime: 60_000,
  });
  return { ...query, entries: query.data ?? [] };
}
