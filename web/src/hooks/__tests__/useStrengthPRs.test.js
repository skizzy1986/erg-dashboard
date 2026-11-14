import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const inMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useStrengthPRs } from '../useStrengthPRs.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function mockResult(result) {
  const promise = Promise.resolve(result);
  const chain = {
    select: () => Object.assign(promise, { in: inMock }),
  };
  fromMock.mockReturnValue(chain);
}

describe('useStrengthPRs', () => {
  beforeEach(() => {
    fromMock.mockReset();
    inMock.mockReset();
  });

  it('reads every exercise_prs row without a name filter', async () => {
    mockResult({
      data: [{ exercise_name: 'Barbell Squat', best_e1rm_kg: null }],
      error: null,
    });
    const { result } = renderHook(() => useStrengthPRs(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('exercise_prs');
    expect(inMock).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([
      { exercise_name: 'Barbell Squat', best_e1rm_kg: null },
    ]);
  });

  it('returns [] for a null payload', async () => {
    mockResult({ data: null, error: null });
    const { result } = renderHook(() => useStrengthPRs(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('throws the Supabase error', async () => {
    const error = { message: 'boom' };
    mockResult({ data: null, error });
    const { result } = renderHook(() => useStrengthPRs(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
