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

import { useBenchmarkSessions } from '../useBenchmarkSessions.js';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeWrapper(client) {
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

// order() spies on its arguments and keeps returning the chain; limit()
// terminates it. The query contract is what this hook is — there is no derived
// state to assert on.
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

async function renderBenchmarkSessions(client = makeClient()) {
  const { result } = renderHook(() => useBenchmarkSessions(), {
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

describe('useBenchmarkSessions', () => {
  it('orders on the derived date_iso column with NULLS LAST', async () => {
    mockQuery([]);
    await renderBenchmarkSessions();
    expect(orderMock).toHaveBeenCalledWith('date_iso', {
      ascending: false,
      nullsFirst: false,
    });
  });

  it('never orders on the lexically-sorting text date column (#187)', async () => {
    mockQuery([]);
    await renderBenchmarkSessions();
    expect(orderMock).not.toHaveBeenCalledWith('date', expect.anything());
  });

  it('requests the full 500-row benchmark history', async () => {
    mockQuery([]);
    await renderBenchmarkSessions();
    expect(limitMock).toHaveBeenCalledWith(500);
  });

  // Deliberate asymmetry with useErgSessions: the ladder resolver picks by date,
  // not by position, so it needs no id tiebreaker. Pinned so a future reader does
  // not "fix" the difference.
  it('does not add an id tiebreaker', async () => {
    mockQuery([]);
    await renderBenchmarkSessions();
    expect(orderMock).not.toHaveBeenCalledWith('id', expect.anything());
  });

  it('keeps the cache key under the ["sessions"] prefix so invalidation reaches it', async () => {
    mockQuery([]);
    const client = makeClient();
    await renderBenchmarkSessions(client);
    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: ['sessions'] })
        .map((q) => q.queryKey)
    ).toContainEqual(['sessions', 'benchmark-window']);
  });

  it('returns an empty array when there are no sessions', async () => {
    mockQuery(null);
    const result = await renderBenchmarkSessions();
    expect(result.current.data).toEqual([]);
  });

  it('sets isError on supabase error', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useBenchmarkSessions(), {
      wrapper: makeWrapper(makeClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
