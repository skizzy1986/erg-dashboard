import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  QueryClient,
  QueryCache,
  QueryClientProvider,
} from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const calls = {};

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));
vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));

import { captureError } from '../../utils/sentry.js';
import { handleQueryError } from '../../utils/queryErrorHandlers.js';
import { useInjuries } from '../useInjuries.js';

function makeWrapper() {
  const client = new QueryClient({
    queryCache: new QueryCache({ onError: handleQueryError }),
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

function mockRead(data, error = null) {
  const chain = {
    select: (cols) => ((calls.select = cols), chain),
    order: (col, opts) => ((calls.order = [col, opts]), chain),
    limit: (n) => ((calls.limit = n), Promise.resolve({ data, error })),
  };
  fromMock.mockImplementation((table) => ((calls.table = table), chain));
}

const ROW = {
  id: 'i1',
  region: 'Hamstring',
  side: 'left',
  onset_on: '2026-05-01',
  resolved_on: null,
  status: 'monitoring',
  note: null,
};

beforeEach(() => {
  fromMock.mockReset();
  vi.mocked(captureError).mockReset();
});

describe('useInjuries', () => {
  it('reads injuries by onset, newest first with undated last, 50 rows', async () => {
    mockRead([ROW]);
    const { result } = renderHook(() => useInjuries(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls.table).toBe('injuries');
    expect(calls.select).toMatch(/region.*side.*onset_on.*status/);
    expect(calls.order).toEqual([
      'onset_on',
      { ascending: false, nullsFirst: false },
    ]);
    expect(calls.limit).toBe(50);
    expect(result.current.rows).toEqual([ROW]);
  });

  it('returns empty rows for a null payload', async () => {
    mockRead(null);
    const { result } = renderHook(() => useInjuries(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.rows).toEqual([]);
  });

  it('reports a read error to captureError with its query key', async () => {
    const error = { message: 'boom' };
    mockRead(null, error);
    const { result } = renderHook(() => useInjuries(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'query',
      queryKey: ['injuries'],
    });
  });

  it('keeps earlier rows when a refetch fails', async () => {
    mockRead([ROW]);
    const { result } = renderHook(() => useInjuries(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    mockRead(null, { message: 'down' });
    let refetched;
    await act(async () => {
      refetched = await result.current.refetch();
    });
    expect(refetched.isError).toBe(true);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.rows).toEqual([ROW]);
  });
});
