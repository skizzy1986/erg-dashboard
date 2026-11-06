import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const calls = {};

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useCoachLog } from '../useCoachLog.js';

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
    in: (...a) => ((calls.in = a), chain),
    order: (...a) => ((calls.order = a), chain),
    limit: (...a) => ((calls.limit = a), Promise.resolve({ data, error })),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  for (const k of Object.keys(calls)) delete calls[k];
});

describe('useCoachLog', () => {
  it('queries decisions + observations only, by date desc, capped at 200', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useCoachLog(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('coach_log');
    expect(calls.select[0]).toBe(
      'id, date, entry_type, body, tags, supersedes, created_at'
    );
    expect(calls.in).toEqual(['entry_type', ['decision', 'observation']]);
    expect(calls.order).toEqual(['date', { ascending: false }]);
    expect(calls.limit).toEqual([200]);
    expect(result.current.decisions).toEqual([]);
    expect(result.current.hypotheses).toEqual([]);
  });

  it('derives decisions and live hypotheses (synthetic rows)', async () => {
    mockQuery([
      {
        id: 2,
        date: '2026-01-02',
        entry_type: 'decision',
        body: 'B\n\nwhy B',
        tags: [],
        supersedes: 1,
      },
      {
        id: 1,
        date: '2026-01-01',
        entry_type: 'decision',
        body: 'A',
        tags: [],
      },
      {
        id: 3,
        date: '2026-01-01',
        entry_type: 'observation',
        body: 'H',
        tags: ['hypothesis', 'status:firming'],
      },
    ]);
    const { result } = renderHook(() => useCoachLog(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.decisions.map((d) => [d.id, d.superseded])).toEqual([
      [2, false],
      [1, true],
    ]);
    expect(result.current.hypotheses).toEqual([
      {
        id: 3,
        date: '2026-01-01',
        statement: 'H',
        status: 'firming',
        evidence: '',
      },
    ]);
  });

  it('surfaces a query error with empty derived lists', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useCoachLog(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.decisions).toEqual([]);
    expect(result.current.hypotheses).toEqual([]);
  });
});
