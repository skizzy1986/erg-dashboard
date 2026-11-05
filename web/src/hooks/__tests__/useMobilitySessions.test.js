import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const calls = {};

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useMobilitySessions } from '../useMobilitySessions.js';

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
    eq: (...a) => ((calls.eq = a), chain),
    order: (...a) => ((calls.order = a), chain),
    limit: (...a) => ((calls.limit = a), Promise.resolve({ data, error })),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  for (const k of Object.keys(calls)) delete calls[k];
});

describe('useMobilitySessions', () => {
  it('reads mobility sessions ordered by date_iso desc, nulls last', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useMobilitySessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('sessions');
    expect(calls.select[0]).toBe('id, date, label, duration, coach_note');
    expect(calls.eq).toEqual(['type', 'mobility']);
    expect(calls.order).toEqual([
      'date_iso',
      { ascending: false, nullsFirst: false },
    ]);
    expect(calls.limit).toEqual([30]);
    expect(result.current.entries).toEqual([]);
  });

  it('maps rows to log entries (synthetic values)', async () => {
    mockQuery([
      {
        id: 7,
        date: '1/2/26',
        label: 'Example prime',
        duration: '8min',
        coach_note: 'Example note',
      },
      { id: 8, date: '1/1/26', label: null, duration: null, coach_note: null },
    ]);
    const { result } = renderHook(() => useMobilitySessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.entries).toEqual([
      {
        id: 7,
        date: '1/2/26',
        label: 'Example prime',
        duration: '8min',
        note: 'Example note',
      },
      { id: 8, date: '1/1/26', label: 'Mobility', duration: '', note: '' },
    ]);
  });

  it('surfaces a query error with no entries', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useMobilitySessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.entries).toEqual([]);
  });
});
