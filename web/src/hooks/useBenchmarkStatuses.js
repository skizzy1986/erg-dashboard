import { useMemo } from 'react';
import { EVENT_LADDER } from '../constants/schedule.js';
import { resolveLadderStatuses } from '../utils/benchmarkStatus.js';
import { todayISO } from '../utils/eventWindow.js';
import { useBenchmarkSessions } from './useBenchmarkSessions.js';

// The only place in this feature that reads the clock. Everything below is pure
// and takes `today` as an argument.
export function useBenchmarkStatuses(ladder = EVENT_LADDER, options = {}) {
  const { data, isPending, isError } = useBenchmarkSessions();
  const sessionsReady = !isPending && !isError && Array.isArray(data);
  const today = options.today ?? todayISO();

  return useMemo(
    () => resolveLadderStatuses(ladder, data, { today, sessionsReady }),
    [ladder, data, today, sessionsReady]
  );
}
