import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useLiftHistory } from '../useLiftHistory.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function mockResult(result) {
  const chain = {
    select: (...args) => {
      selectMock(...args);
      return chain;
    },
    order: (...args) => {
      orderMock(...args);
      return Promise.resolve(result);
    },
  };
  fromMock.mockReturnValue(chain);
}

describe('useLiftHistory', () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    orderMock.mockReset();
  });

  it('embeds strength_sets under strength_workouts, ordered by workout_date', async () => {
    mockResult({
      data: [
        {
          workout_date: '2001-01-02',
          strength_sets: [
            {
              exercise_name: 'Lift A',
              weight_kg: 30,
              reps: 3,
              is_warmup: false,
              completed: true,
              hold_seconds: null,
            },
          ],
        },
      ],
      error: null,
    });
    const { result } = renderHook(() => useLiftHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromMock).toHaveBeenCalledWith('strength_workouts');
    expect(selectMock).toHaveBeenCalledWith(
      'workout_date, strength_sets(exercise_name, weight_kg, reps, is_warmup, completed, hold_seconds)'
    );
    expect(orderMock).toHaveBeenCalledWith('workout_date', {
      ascending: true,
    });
    expect(result.current.data).toEqual({
      lifts: { 'Lift A': [{ date: '1/2/01', e1rm: 33 }] },
      setCount: 1,
      scoredCount: 1,
    });
  });

  it('treats a null payload as no workouts', async () => {
    mockResult({ data: null, error: null });
    const { result } = renderHook(() => useLiftHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      lifts: {},
      setCount: 0,
      scoredCount: 0,
    });
  });

  it('throws the Supabase error so the query lands in its error state', async () => {
    const error = { message: 'permission denied' };
    mockResult({ data: null, error });
    const { result } = renderHook(() => useLiftHistory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
