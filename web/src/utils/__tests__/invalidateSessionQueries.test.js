import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateSessionQueries } from '../invalidateSessionQueries.js';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('invalidateSessionQueries', () => {
  it('invalidates exactly the three session-reading query keys', () => {
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    invalidateSessionQueries(client);

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['erg-sessions'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tss-history'] });
  });

  it('does not name the benchmark keys — the sessions prefix covers them', () => {
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    invalidateSessionQueries(client);

    expect(spy).not.toHaveBeenCalledWith({
      queryKey: ['sessions', 'benchmark-window'],
    });
    expect(spy).not.toHaveBeenCalledWith({
      queryKey: ['benchmark-sessions'],
    });
  });

  it('marks a cached benchmark-window query stale via the sessions prefix', async () => {
    const client = makeClient();
    const key = ['sessions', 'benchmark-window'];
    await client.fetchQuery({ queryKey: key, queryFn: async () => ['row'] });
    expect(client.getQueryState(key).isInvalidated).toBe(false);

    invalidateSessionQueries(client);

    expect(client.getQueryState(key).isInvalidated).toBe(true);
  });
});
