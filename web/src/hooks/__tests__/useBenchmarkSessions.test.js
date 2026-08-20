import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const selectMock = vi.fn();
const inMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useBenchmarkSessions } from '../useBenchmarkSessions.js';

let client;

function makeWrapper() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

function mockQuery(data, error = null) {
  const chain = {
    select: (...args) => {
      selectMock(...args);
      return chain;
    },
    in: (...args) => {
      inMock(...args);
      return chain;
    },
    limit: (...args) => {
      limitMock(...args);
      return chain;
    },
    order: (...args) => {
      orderMock(...args);
      return Promise.resolve({ data, error });
    },
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  for (const m of [fromMock, selectMock, inMock, orderMock, limitMock]) {
    m.mockReset();
  }
});

async function renderQuery() {
  const { result } = renderHook(() => useBenchmarkSessions(), {
    wrapper: makeWrapper(),
  });
  return result;
}

describe('useBenchmarkSessions', () => {
  it('caches under the ["benchmark-sessions"] query key', async () => {
    mockQuery([]);
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      client.getQueryCache().find({ queryKey: ['benchmark-sessions'] })
    ).toBeDefined();
  });

  it("filters on .in('status', ['actual', 'completed', 'logged'])", async () => {
    mockQuery([]);
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inMock).toHaveBeenCalledWith('status', [
      'actual',
      'completed',
      'logged',
    ]);
  });

  it('selects id, date, label and status from sessions', async () => {
    mockQuery([]);
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('sessions');
    const selected = selectMock.mock.calls[0][0];
    for (const col of ['id', 'date', 'label', 'status']) {
      expect(selected).toContain(col);
    }
  });

  it('never applies a .limit() — a truncated page would fake an OVERDUE', async () => {
    mockQuery([]);
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(limitMock).not.toHaveBeenCalled();
    expect(orderMock).toHaveBeenCalledWith('id', { ascending: true });
  });

  it('rejects rather than returning [] when supabase errors', async () => {
    mockQuery(null, { message: 'network error' });
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('returns [] when supabase returns null data', async () => {
    mockQuery(null);
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('passes rows through unchanged', async () => {
    const rows = [
      { id: 1, date: '8/5/26', label: '5000m Time Trial', status: 'logged' },
    ];
    mockQuery(rows);
    const result = await renderQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
  });
});
