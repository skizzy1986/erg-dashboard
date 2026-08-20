import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useBenchmarkStatuses } from '../useBenchmarkStatuses.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

const TODAY = '2026-08-20';
const LADDER = [EVENT_LADDER[1]]; // '~Mid Jul 26' · CP Test #2 (2nd duration)

const RETEST = {
  id: 61,
  date: '7/5/26',
  label: 'CP RETEST — 1min + 4min max (rested, fed)',
};

let payload = { data: [], error: null };

function mockSessions() {
  fromMock.mockImplementation(() => {
    const chain = {
      select: () => chain,
      order: () => chain,
      limit: () => Promise.resolve(payload),
    };
    return chain;
  });
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  const view = renderHook(
    () => useBenchmarkStatuses(LADDER, { today: TODAY }),
    { wrapper: Wrapper }
  );
  return { ...view, client };
}

beforeEach(() => {
  fromMock.mockReset();
  payload = { data: [], error: null };
});

describe('useBenchmarkStatuses', () => {
  it('reports unknown while the sessions query is still pending', () => {
    mockSessions();
    const { result } = setup();
    expect(result.current).toHaveLength(1);
    expect(result.current[0].status).toBe('unknown');
  });

  it('L2 reports unknown when the sessions query errors', async () => {
    payload = { data: null, error: { message: 'boom' } };
    mockSessions();
    const { result } = setup();
    await waitFor(() => expect(fromMock).toHaveBeenCalled());
    // The query never succeeds, so the ladder never fabricates an overdue.
    await waitFor(() => expect(result.current[0].status).toBe('unknown'));
    expect(result.current[0].done).toBe(false);
  });

  it('queries the sessions table scoped to the badge fields', async () => {
    mockSessions();
    setup();
    await waitFor(() => expect(fromMock).toHaveBeenCalledWith('sessions'));
  });

  // AC5 — the badge clears once the session is logged, with no edit to the
  // existing invalidateQueries({ queryKey: ['sessions'] }) call sites: the
  // benchmark key is a prefix match of theirs.
  it('AC5 flips from overdue to quiet when the cancelled retest is completed', async () => {
    payload = { data: [{ ...RETEST, status: 'cancelled' }], error: null };
    mockSessions();
    const { result, client } = setup();
    await waitFor(() => expect(result.current[0].status).toBe('overdue'));

    payload = { data: [{ ...RETEST, status: 'logged' }], error: null };
    await client.invalidateQueries({ queryKey: ['sessions'] });

    await waitFor(() => expect(result.current[0].status).toBe('quiet'));
    expect(result.current[0].matchedSessionId).toBe(61);
  });

  // D1 — the clearing row must survive the payload size, not just the first page.
  it('D1 resolves a clearing session sitting deep in the payload', async () => {
    const filler = Array.from({ length: 300 }, (_, i) => ({
      id: 1000 + i,
      date: '7/15/26',
      label: 'UT2 40min recovery @ 130-142W',
      status: 'completed',
    }));
    payload = {
      data: [...filler, { ...RETEST, status: 'completed' }],
      error: null,
    };
    mockSessions();
    const { result } = setup();
    await waitFor(() => expect(result.current[0].status).toBe('quiet'));
    expect(result.current[0].matchedSessionId).toBe(61);
  });

  it('defaults to the full live ladder', async () => {
    mockSessions();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function Wrapper({ children }) {
      return React.createElement(QueryClientProvider, { client }, children);
    }
    const { result } = renderHook(() => useBenchmarkStatuses(), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(result.current).toHaveLength(EVENT_LADDER.length)
    );
  });
});
