import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient.js';

export function useVitalsSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('vitals-sync');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
    },
  });
}
