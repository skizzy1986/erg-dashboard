import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useSessions } from '../useSessions.js';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeWrapper(client) {
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

// order() is called twice (date_iso, then id) and must keep returning the chain;
// limit() terminates it. Both spy on their arguments so the query contract —
// which is where the #187 fix actually lives — can be asserted.
function mockQuery(data, error = null) {
  const chain = {
    select: () => chain,
    order: (...args) => {
      orderMock(...args);
      return chain;
    },
    limit: (...args) => {
      limitMock(...args);
      return Promise.resolve({ data, error });
    },
  };
  fromMock.mockReturnValue(chain);
}

function rows(...dates) {
  return dates.map((date, i) => ({ id: i + 1, date, type: 'erg' }));
}

async function renderSessions(client = makeClient()) {
  const { result } = renderHook(() => useSessions(), {
    wrapper: makeWrapper(client),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
}

beforeEach(() => {
  fromMock.mockReset();
  orderMock.mockReset();
  limitMock.mockReset();
});

describe('useSessions', () => {
  it('orders on the derived date_iso column with NULLS LAST', async () => {
    mockQuery([]);
    await renderSessions();
    expect(orderMock).toHaveBeenCalledWith('date_iso', {
      ascending: false,
      nullsFirst: false,
    });
  });

  it('never orders on the lexically-sorting text date column (#187)', async () => {
    mockQuery([]);
    await renderSessions();
    expect(orderMock).not.toHaveBeenCalledWith('date', expect.anything());
  });

  it('breaks ties on id so the limit boundary is deterministic', async () => {
    mockQuery([]);
    await renderSessions();
    expect(orderMock).toHaveBeenCalledWith('id', { ascending: false });
  });

  it('requests a 50-row recency window', async () => {
    mockQuery([]);
    await renderSessions();
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it('re-sorts a lexically-ordered payload across a month boundary', async () => {
    mockQuery(rows('6/4/26', '6/30/26', '9/30/26', '12/1/26'));
    const result = await renderSessions();
    expect(result.current.data.map((s) => s.date)).toEqual([
      '12/1/26',
      '9/30/26',
      '6/30/26',
      '6/4/26',
    ]);
  });

  it('re-sorts across a year boundary', async () => {
    mockQuery(rows('12/31/25', '1/1/26', '2/14/26'));
    const result = await renderSessions();
    expect(result.current.data.map((s) => s.date)).toEqual([
      '2/14/26',
      '1/1/26',
      '12/31/25',
    ]);
  });

  it('sorts an unparseable date last, mirroring NULLS LAST', async () => {
    mockQuery(rows('garbage', '8/7/26', '5/22/26'));
    const result = await renderSessions();
    expect(result.current.data.map((s) => s.date)).toEqual([
      '8/7/26',
      '5/22/26',
      'garbage',
    ]);
  });

  it('keeps the cache key exactly ["sessions"] so prefix invalidation still reaches the benchmark window', async () => {
    mockQuery([]);
    const client = makeClient();
    await renderSessions(client);
    expect(
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey)
    ).toContainEqual(['sessions']);
  });

  it('returns an empty array when there are no sessions', async () => {
    mockQuery(null);
    const result = await renderSessions();
    expect(result.current.data).toEqual([]);
  });

  it('surfaces a supabase error', async () => {
    mockQuery(null, { message: 'network error' });
    const { result } = renderHook(() => useSessions(), {
      wrapper: makeWrapper(makeClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
