import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const calls = {};

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useNutritionDays } from '../useNutritionDays.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function mockQuery(data, error = null) {
  const chain = {
    select: (...a) => ((calls.select = a), chain),
    not: (...a) => ((calls.not = a), chain),
    order: (...a) => ((calls.order = a), chain),
    limit: (...a) => ((calls.limit = a), Promise.resolve({ data, error })),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  for (const k of Object.keys(calls)) delete calls[k];
});

describe('useNutritionDays', () => {
  it('reads intake days from vitals, newest first, capped at 7', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useNutritionDays(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('vitals');
    expect(calls.select[0]).toBe(
      'date, intake_kcal, intake_protein_g, intake_carbs_g, intake_fat_g, nutrition_day_type, nutrition_note, calories_kcal, bodyweight_kg'
    );
    expect(calls.not).toEqual(['intake_kcal', 'is', null]);
    expect(calls.order).toEqual(['date', { ascending: false }]);
    expect(calls.limit).toEqual([7]);
    expect(result.current.days).toEqual([]);
  });

  it('maps rows to the legacy nutrition-day shape (synthetic values)', async () => {
    mockQuery([
      {
        date: '2026-01-02',
        intake_kcal: 2000,
        intake_protein_g: '150.5',
        intake_carbs_g: '200.0',
        intake_fat_g: '60.0',
        nutrition_day_type: 'training',
        nutrition_note: 'example',
        calories_kcal: 2400,
        bodyweight_kg: '80.0',
      },
      {
        date: '2026-01-01',
        intake_kcal: 1900,
        intake_protein_g: null,
        intake_carbs_g: null,
        intake_fat_g: null,
        nutrition_day_type: null,
        nutrition_note: null,
        calories_kcal: null,
        bodyweight_kg: null,
      },
    ]);
    const { result } = renderHook(() => useNutritionDays(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.days).toEqual([
      {
        date: '2026-01-02',
        dayType: 'training',
        cal: 2000,
        protein: 150.5,
        carbs: 200,
        fat: 60,
        burn: 2400,
        weight: 80,
        note: 'example',
      },
      {
        date: '2026-01-01',
        dayType: null,
        cal: 1900,
        protein: null,
        carbs: null,
        fat: null,
        burn: null,
        weight: null,
        note: null,
      },
    ]);
  });

  it('surfaces a query error with no days', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useNutritionDays(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.days).toEqual([]);
  });
});
