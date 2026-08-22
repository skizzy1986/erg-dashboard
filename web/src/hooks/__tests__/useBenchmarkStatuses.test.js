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

import {
  useBenchmarkDataUnavailable,
  useBenchmarkStatuses,
} from '../useBenchmarkStatuses.js';
import { EVENT_LADDER } from '../../constants/schedule.js';

const TODAY = '2026-08-20';
// The full ladder, not just entry 1: a one-entry ladder cannot show that a link
// lands on the benchmark it names and on no other. IDX is CP Test #2's
// position, whose key is 'cp-test-2'.
const LADDER = EVENT_LADDER;
const IDX = 1;

const RETEST = {
  id: 61,
  date: '7/5/26',
  label: 'CP RETEST — 1min + 4min max (rested, fed)',
  benchmark_key: 'cp-test-2',
};

// CP Test #1, completed eight days early and explicitly linked. Present in the
// live table, so the full-ladder tests below carry it.
const CP1_DONE = {
  id: 45,
  date: '6/23/26',
  label: 'CP Test - 4min MAX (GATED)',
  status: 'completed',
  benchmark_key: 'cp-test-1',
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
    expect(result.current).toHaveLength(EVENT_LADDER.length);
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

  // AC5 — the badge clears once the link lands, with no edit to the existing
  // invalidateQueries({ queryKey: ['sessions'] }) call sites: the benchmark
  // query key is a prefix match of theirs. The row itself never changes label
  // or date here; only benchmark_key moves, which is the whole feature.
  it('AC5 flips from overdue to quiet when the link lands', async () => {
    payload = {
      data: [{ ...RETEST, status: 'completed', benchmark_key: null }, CP1_DONE],
      error: null,
    };
    mockSessions();
    const { result, client } = setup();
    await waitFor(() => expect(result.current[IDX].status).toBe('overdue'));
    expect(result.current[IDX].matchedSessionId).toBeNull();

    payload = {
      data: [{ ...RETEST, status: 'completed' }, CP1_DONE],
      error: null,
    };
    await client.invalidateQueries({ queryKey: ['sessions'] });

    await waitFor(() => expect(result.current[IDX].status).toBe('quiet'));
    expect(result.current[IDX].matchedSessionId).toBe(61);
    expect(result.current[0].matchedSessionId).toBe(45);
  });

  // D1 — the linked row must survive the payload size, not just the first page.
  it('D1 resolves a linked session sitting deep in the payload', async () => {
    const filler = Array.from({ length: 300 }, (_, i) => ({
      id: 1000 + i,
      date: '7/15/26',
      label: 'UT2 40min recovery @ 130-142W',
      status: 'completed',
      benchmark_key: null,
    }));
    payload = {
      data: [...filler, { ...RETEST, status: 'completed' }, CP1_DONE],
      error: null,
    };
    mockSessions();
    const { result } = setup();
    await waitFor(() => expect(result.current[IDX].status).toBe('quiet'));
    expect(result.current[IDX].matchedSessionId).toBe(61);
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

// AC9's companion: the ladder resolving to all-`unknown` is indistinguishable
// from "nothing due", so callers need a separate way to say the read failed.
describe('useBenchmarkDataUnavailable', () => {
  function setupFlag() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function Wrapper({ children }) {
      return React.createElement(QueryClientProvider, { client }, children);
    }
    return renderHook(() => useBenchmarkDataUnavailable(), {
      wrapper: Wrapper,
    });
  }

  it('reports unavailable once the sessions read fails', async () => {
    payload = { data: null, error: { message: 'boom' } };
    mockSessions();
    const { result } = setupFlag();
    await waitFor(() => expect(result.current).toBe(true));
  });

  // Pending is deliberately NOT unavailable: a slow first read must not flash
  // an outage line and then replace it with badges.
  it('stays false while the read is pending and after it succeeds', async () => {
    payload = { data: [], error: null };
    mockSessions();
    const { result } = setupFlag();
    expect(result.current).toBe(false);
    await waitFor(() => expect(fromMock).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
