import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const inMock = vi.fn();

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
    in: (...args) => {
      inMock(...args);
      return chain;
    },
    gt: () => chain,
    order: () => Promise.resolve({ data, error }),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  inMock.mockReset();
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

  it("filters on status via .in(['actual', 'completed', 'logged']), not .eq('logged')", async () => {
    mockQuery([]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inMock).toHaveBeenCalledWith('status', [
      'actual',
      'completed',
      'logged',
    ]);
  });

  it('maps sessions to { date, tss } using duration * srpe / 60 (numeric duration)', async () => {
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

  it('parses mm:ss duration "45:00" (45 * 6 / 60 = 5)', async () => {
    mockQuery([{ date: '2026-06-20', duration: '45:00', srpe: 6 }]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].tss).toBe(5);
  });

  it('parses minutes-suffix duration "57m" (57 * 5 / 60 = 4.75 → 5)', async () => {
    mockQuery([{ date: '2026-06-20', duration: '57m', srpe: 5 }]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].tss).toBe(5);
  });

  it('parses hours+minutes duration "1h4m" (64 * 10 / 60 = 10.67 → 11)', async () => {
    mockQuery([{ date: '2026-06-20', duration: '1h4m', srpe: 10 }]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].tss).toBe(11);
  });

  it('degrades unparseable duration to tss 0 without NaN', async () => {
    mockQuery([{ date: '2026-06-20', duration: 'garbage', srpe: 8 }]);
    const { result } = renderHook(() => useTSSHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].tss).toBe(0);
    expect(Number.isNaN(result.current.data[0].tss)).toBe(false);
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
});
