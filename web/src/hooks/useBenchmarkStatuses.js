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

// A failed read resolves every entry to `unknown`, which renders no badge —
// and silence is exactly what "no benchmarks due" looks like. Callers use this
// to say the status is unknown rather than imply everything is fine. Pending is
// deliberately NOT unavailable: a slow first read must not flash an outage line
// and then replace it with badges. Same query key as above, so react-query
// serves it from cache rather than issuing a second request.
export function useBenchmarkDataUnavailable() {
  const { isError } = useBenchmarkSessions();
  return isError;
}
