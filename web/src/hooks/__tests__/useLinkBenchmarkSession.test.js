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

import { useLinkBenchmarkSession } from '../useLinkBenchmarkSession.js';

// Every .update().eq() lands in `calls` in the order it was issued, so the
// clear-then-set ORDER is directly assertable rather than merely implied.
let calls;
let results;

function mockSessions() {
  calls = [];
  fromMock.mockImplementation((table) => ({
    update: (values) => ({
      eq: (column, value) => {
        calls.push({ table, values, column, value });
        const next = results.shift();
        return Promise.resolve(next ?? { data: null, error: null });
      },
    }),
  }));
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  const view = renderHook(() => useLinkBenchmarkSession(), {
    wrapper: Wrapper,
  });
  return { ...view, client, invalidateSpy };
}

beforeEach(() => {
  fromMock.mockReset();
  results = [];
  mockSessions();
});

describe('useLinkBenchmarkSession', () => {
  // Risk 5. sessions_one_session_per_benchmark is a partial unique index on
  // (user_id, benchmark_key), so setting the new holder while the incumbent
  // still carries the key is a guaranteed 23505. Order is the fix, so order is
  // the assertion — not just "both statements ran".
  it('clears the incumbent before setting the new holder', async () => {
    const { result } = setup();
    await result.current.mutateAsync({
      benchmarkKey: 'cp-test-2',
      sessionId: 61,
    });

    expect(calls).toEqual([
      {
        table: 'sessions',
        values: { benchmark_key: null },
        column: 'benchmark_key',
        value: 'cp-test-2',
      },
      {
        table: 'sessions',
        values: { benchmark_key: 'cp-test-2' },
        column: 'id',
        value: 61,
      },
    ]);
  });

  // AC4's database half. A duplicate arrives as a 23505 from Postgres; the hook
  // must let it out so the control can say "another session already claims this
  // benchmark" rather than silently reporting success.
  it('surfaces a unique violation when another session already claims the benchmark', async () => {
    results = [
      { data: null, error: null },
      {
        data: null,
        error: {
          code: '23505',
          message:
            'duplicate key value violates unique constraint "sessions_one_session_per_benchmark"',
        },
      },
    ];
    const { result } = setup();

    await expect(
      result.current.mutateAsync({ benchmarkKey: 'cp-test-2', sessionId: 61 })
    ).rejects.toMatchObject({ code: '23505' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.code).toBe('23505');
  });

  it('throws when the clear fails and never attempts the set', async () => {
    results = [{ data: null, error: { code: '42501', message: 'denied' } }];
    const { result } = setup();

    await expect(
      result.current.mutateAsync({ benchmarkKey: 'cp-test-2', sessionId: 61 })
    ).rejects.toMatchObject({ code: '42501' });

    expect(calls).toHaveLength(1);
  });

  it('unlinks with the clear alone when sessionId is null', async () => {
    const { result } = setup();
    await result.current.mutateAsync({
      benchmarkKey: '5k-tt',
      sessionId: null,
    });

    expect(calls).toEqual([
      {
        table: 'sessions',
        values: { benchmark_key: null },
        column: 'benchmark_key',
        value: '5k-tt',
      },
    ]);
  });

  it('treats an undefined sessionId as an unlink', async () => {
    const { result } = setup();
    await result.current.mutateAsync({ benchmarkKey: '5k-tt' });
    expect(calls).toHaveLength(1);
  });

  // Prefix match, no `exact`: ['sessions','benchmark-window'] is a child of
  // ['sessions'], so the badge refetches without touching any other call site.
  it('invalidates the sessions query tree on success', async () => {
    const { result, invalidateSpy } = setup();
    await result.current.mutateAsync({
      benchmarkKey: 'cp-test-1',
      sessionId: 45,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
  });

  // The clear can land and the set fail, which nulls the key in the database
  // while the cache still names the old holder. Invalidating only on success
  // would leave the badge reading done against an unlinked row — a false-done,
  // the one direction this design promises it cannot produce.
  it('invalidates when the set fails after the clear landed', async () => {
    results = [
      { data: null, error: null },
      { data: null, error: { code: '23505', message: 'duplicate key' } },
    ];
    const { result, invalidateSpy } = setup();

    await expect(
      result.current.mutateAsync({ benchmarkKey: 'cp-test-1', sessionId: 45 })
    ).rejects.toMatchObject({ code: '23505' });

    expect(calls).toHaveLength(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
  });

  it('invalidates when the clear itself fails', async () => {
    results = [{ data: null, error: { code: '42501', message: 'denied' } }];
    const { result, invalidateSpy } = setup();

    await expect(
      result.current.mutateAsync({ benchmarkKey: 'cp-test-1', sessionId: 45 })
    ).rejects.toMatchObject({ code: '42501' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
  });
});
