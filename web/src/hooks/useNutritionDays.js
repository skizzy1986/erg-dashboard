import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

const num = (v) => (v == null ? null : Number(v));

// Days with logged intake (vitals intake columns), newest first. `burn` is the
// device's calories_kcal and `weight` the bodyweight_kg on the same row.
export function useNutritionDays() {
  const query = useQuery({
    queryKey: ['vitals', 'nutrition'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitals')
        .select(
          'date, intake_kcal, intake_protein_g, intake_carbs_g, intake_fat_g, nutrition_day_type, nutrition_note, calories_kcal, bodyweight_kg'
        )
        .not('intake_kcal', 'is', null)
        .order('date', { ascending: false })
        .limit(7);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: r.date,
        dayType: r.nutrition_day_type ?? null,
        cal: num(r.intake_kcal),
        protein: num(r.intake_protein_g),
        carbs: num(r.intake_carbs_g),
        fat: num(r.intake_fat_g),
        burn: num(r.calories_kcal),
        weight: num(r.bodyweight_kg),
        note: r.nutrition_note ?? null,
      }));
    },
    staleTime: 60_000,
  });
  return { ...query, days: query.data ?? [] };
}
