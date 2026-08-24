import { captureError } from './sentry.js';

// React Query swallows nothing — it rethrows into the hook — but nothing was
// listening either, so every failed Supabase read/write died in the cache with
// no telemetry. These handlers are wired into the QueryClient's QueryCache and
// MutationCache in main.jsx; they are the reason a broken query is now visible.
//
// They live here rather than in main.jsx because main.jsx is excluded from the
// coverage denominator (it is the auth/bootstrap entry point and is not
// unit-testable in jsdom), and this logic must be covered.

export function handleQueryError(error, query) {
  captureError(error, {
    source: 'react-query',
    kind: 'query',
    queryKey: query?.queryKey,
  });
}

export function handleMutationError(error, _variables, _context, mutation) {
  captureError(error, {
    source: 'react-query',
    kind: 'mutation',
    mutationKey: mutation?.options?.mutationKey,
  });
}
