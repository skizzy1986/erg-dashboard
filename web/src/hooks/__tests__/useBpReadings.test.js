import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  QueryClient,
  QueryCache,
  QueryClientProvider,
  onlineManager,
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
import { useBpReadings } from '../useBpReadings.js';

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
  id: 'a',
  measured_at: '2026-08-20T16:30:00Z',
  sys_mmhg: '118',
  dia_mmhg: 76,
  pulse_bpm: null,
  context: 'seated',
  clean: true,
};

beforeEach(() => {
  fromMock.mockReset();
  vi.mocked(captureError).mockReset();
  for (const k of Object.keys(calls)) delete calls[k];
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('useBpReadings', () => {
  it('reads bp_readings newest first, 30 rows, casting numerics', async () => {
    mockRead([ROW]);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls.table).toBe('bp_readings');
    expect(calls.select).toMatch(/measured_at.*sys_mmhg.*dia_mmhg.*clean/);
    expect(calls.order).toEqual(['measured_at', { ascending: false }]);
    expect(calls.limit).toBe(30);
    expect(result.current.rows[0]).toMatchObject({
      sys_mmhg: 118,
      dia_mmhg: 76,
      pulse_bpm: null,
    });
  });

  it('returns empty rows before data and for a null payload', async () => {
    mockRead(null);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.rows).toEqual([]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.rows).toEqual([]);
  });

  it('reports a read error to captureError through the QueryCache sink', async () => {
    const error = { message: 'boom' };
    mockRead(null, error);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'query',
      queryKey: ['bp_readings'],
    });
  });

  it('keeps rows fetched earlier in the session when a refetch fails', async () => {
    mockRead([ROW]);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    mockRead(null, { message: 'network down' });
    let refetched;
    await act(async () => {
      refetched = await result.current.refetch();
    });
    expect(refetched.isError).toBe(true);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.data[0].id).toBe('a');
  });

  it('stays pending with a paused fetch when mounted offline', async () => {
    onlineManager.setOnline(false);
    mockRead([ROW]);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe('paused'));
    expect(result.current.isPending).toBe(true);
    expect(result.current.isPaused).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
