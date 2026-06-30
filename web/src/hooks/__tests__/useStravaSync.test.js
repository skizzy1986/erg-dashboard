import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const invokeMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    functions: {
      invoke: (...args) => invokeMock(...args),
    },
  },
}));

import { useStravaSync } from '../useStravaSync.js';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function makeWrapper(client) {
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe('useStravaSync', () => {
  it('invokes the strava-sync edge function', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, imported: 2, skipped: 1 },
      error: null,
    });
    const { result } = renderHook(() => useStravaSync(), {
      wrapper: makeWrapper(makeClient()),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invokeMock).toHaveBeenCalledWith('strava-sync');
    expect(result.current.data.imported).toBe(2);
  });

  it('invalidates the sessions query on success', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useStravaSync(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['strava-connection'] });
  });

  it('surfaces an error when the function returns one', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useStravaSync(), {
      wrapper: makeWrapper(makeClient()),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
