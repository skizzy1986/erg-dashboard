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
import { useLabResults } from '../useLabResults.js';

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
  id: 'l1',
  collected_on: '2026-08-01',
  panel: 'hormone',
  marker: 'Testosterone',
  value: '18.2',
  value_qualifier: null,
  unit: 'nmol/L',
  ref_low: '8.6',
  ref_high: null,
  ref_source: 'Lab printout',
  note: null,
};

beforeEach(() => {
  fromMock.mockReset();
  vi.mocked(captureError).mockReset();
});

describe('useLabResults', () => {
  it('reads lab_results newest draw first, 200 rows, casting numerics', async () => {
    mockRead([ROW]);
    const { result } = renderHook(() => useLabResults(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls.table).toBe('lab_results');
    expect(calls.select).toMatch(/ref_low.*ref_high.*ref_source/);
    expect(calls.order).toEqual(['collected_on', { ascending: false }]);
    expect(calls.limit).toBe(200);
    expect(result.current.rows[0]).toMatchObject({
      value: 18.2,
      ref_low: 8.6,
      ref_high: null,
      ref_source: 'Lab printout',
    });
  });

  it('returns empty rows for a null payload', async () => {
    mockRead(null);
    const { result } = renderHook(() => useLabResults(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.rows).toEqual([]);
  });

  it('reports a read error to captureError with its query key', async () => {
    const error = { message: 'boom' };
    mockRead(null, error);
    const { result } = renderHook(() => useLabResults(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'query',
      queryKey: ['lab_results'],
    });
  });

  it('keeps earlier rows when a refetch fails', async () => {
    mockRead([ROW]);
    const { result } = renderHook(() => useLabResults(), {
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
    expect(result.current.rows).toHaveLength(1);
  });
});
