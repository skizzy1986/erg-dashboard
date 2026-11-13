import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';
import { buildLiftSeries } from '../utils/liftSeries.js';

export const LIFT_HISTORY_SELECT =
  'workout_date, strength_sets(exercise_name, weight_kg, reps, is_warmup, completed, hold_seconds)';

export function useLiftHistory() {
  return useQuery({
    queryKey: ['lift-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strength_workouts')
        .select(LIFT_HISTORY_SELECT)
        .order('workout_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    select: buildLiftSeries,
  });
}
