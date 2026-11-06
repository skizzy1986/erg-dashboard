import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const calls = {};

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useBpReadings } from '../useBpReadings.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function mockQuery(data, error = null) {
  const chain = {
    select: (...a) => ((calls.select = a), chain),
    order: (...a) => ((calls.order = a), chain),
    limit: (...a) => ((calls.limit = a), Promise.resolve({ data, error })),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  for (const k of Object.keys(calls)) delete calls[k];
});

describe('useBpReadings', () => {
  it('queries bp_readings newest first, capped at 30', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('bp_readings');
    expect(calls.select[0]).toBe(
      'measured_at, sys_mmhg, dia_mmhg, pulse_bpm, context, clean'
    );
    expect(calls.order).toEqual(['measured_at', { ascending: false }]);
    expect(calls.limit).toEqual([30]);
    expect(result.current.readings).toEqual([]);
  });

  it('maps rows to the view shape (synthetic values)', async () => {
    mockQuery([
      {
        measured_at: '2026-01-02T07:00:00Z',
        sys_mmhg: 118,
        dia_mmhg: 76,
        pulse_bpm: 60,
        context: 'example',
        clean: true,
      },
      {
        measured_at: '2026-01-01T07:00:00Z',
        sys_mmhg: 122,
        dia_mmhg: 80,
        pulse_bpm: null,
        context: null,
        clean: null,
      },
    ]);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.readings).toEqual([
      {
        measuredAt: '2026-01-02T07:00:00Z',
        sys: 118,
        dia: 76,
        pulse: 60,
        context: 'example',
        clean: true,
      },
      {
        measuredAt: '2026-01-01T07:00:00Z',
        sys: 122,
        dia: 80,
        pulse: null,
        context: '',
        clean: false,
      },
    ]);
  });

  it('surfaces a query error with no readings', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.readings).toEqual([]);
  });

  it('treats a null data payload as empty', async () => {
    mockQuery(null);
    const { result } = renderHook(() => useBpReadings(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.readings).toEqual([]);
  });
});
