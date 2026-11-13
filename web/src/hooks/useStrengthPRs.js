import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

export function useStrengthPRs() {
  return useQuery({
    queryKey: ['strengthPRs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_prs')
        .select('exercise_name, best_e1rm_kg, heaviest_kg, logged_sets');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
