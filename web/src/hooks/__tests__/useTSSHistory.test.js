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

import { useTSSHistory } from '../useTSSHistory.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

function mockQuery(data, error = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gt: () => chain,
    order: () => Promise.resolve({ data, error }),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
});

describe('useTSSHistory', () => {
  it('returns an empty array when no sessions exist', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('maps sessions to { date, tss } using duration * srpe / 60', async () => {
    mockQuery([{ date: '2026-06-20', duration: 60, srpe: 7 }]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ date: '2026-06-20', tss: 7 }]);
  });

  it('rounds TSS to nearest integer', async () => {
    mockQuery([{ date: '2026-06-20', duration: 45, srpe: 6 }]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 45 * 6 / 60 = 4.5 → rounds to 5
    expect(result.current.data[0].tss).toBe(5);
  });

  it('returns multiple sessions in ascending date order', async () => {
    mockQuery([
      { date: '2026-06-01', duration: 60, srpe: 5 },
      { date: '2026-06-10', duration: 60, srpe: 8 },
    ]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.length).toBe(2);
    expect(result.current.data[0].date).toBe('2026-06-01');
  });

  it('throws (isError) when supabase returns an error', async () => {
    mockQuery(null, { message: 'network error' });
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('sums TSS for multiple sessions on the same day', async () => {
    mockQuery([
      { date: '2026-06-20', duration: 60, srpe: 6 }, // 6
      { date: '2026-06-20', duration: 30, srpe: 8 }, // 4
    ]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ date: '2026-06-20', tss: 10 }]);
  });

  it('rounds the per-day sum, not each session', async () => {
    mockQuery([
      { date: '2026-06-20', duration: 45, srpe: 6 }, // 4.5
      { date: '2026-06-20', duration: 45, srpe: 6 }, // 4.5
    ]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 4.5 + 4.5 = 9.0 → 9, not round(4.5)+round(4.5) = 10
    expect(result.current.data[0].tss).toBe(9);
  });
});
