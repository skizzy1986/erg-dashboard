import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const invokeMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: { functions: { invoke: (...args) => invokeMock(...args) } },
}));

import { useStravaSync } from '../useStravaSync.js';

let client;
let invalidateSpy;

function wrapper({ children }) {
  return React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  invokeMock.mockReset();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = vi.spyOn(client, 'invalidateQueries');
});

const keys = () => invalidateSpy.mock.calls.map(([arg]) => arg.queryKey);

describe('useStravaSync', () => {
  it('invokes strava-sync and returns its result', async () => {
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        imported: 3,
        adopted: 1,
        skipped: 0,
        failed: 0,
        status: 'ok',
      },
      error: null,
    });
    const { result } = renderHook(() => useStravaSync(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invokeMock).toHaveBeenCalledWith('strava-sync', { body: {} });
    expect(result.current.data.imported).toBe(3);
  });

  it('invalidates the connection and every session query, then calls onSynced', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const onSynced = vi.fn();
    const { result } = renderHook(() => useStravaSync({ onSynced }), {
      wrapper,
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(keys()).toEqual([
      ['strava', 'connection'],
      ['sessions'],
      ['erg-sessions'],
      ['tss-history'],
    ]);
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate or call onSynced when the function fails', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const onSynced = vi.fn();
    const { result } = renderHook(() => useStravaSync({ onSynced }), {
      wrapper,
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(onSynced).not.toHaveBeenCalled();
  });

  it('works with no onSynced callback supplied', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const { result } = renderHook(() => useStravaSync(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(keys()).toContainEqual(['tss-history']);
  });
});
