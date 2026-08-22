// Every query that reads `sessions`. A session insert must invalidate all of
// them; the three write paths each used to pick their own subset and disagreed
// (#195). ['sessions'] is a prefix, so it also reaches
// ['sessions','benchmark-window'] — do NOT list that key separately.
export function invalidateSessionQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['sessions'] });
  queryClient.invalidateQueries({ queryKey: ['erg-sessions'] });
  queryClient.invalidateQueries({ queryKey: ['tss-history'] });
}
