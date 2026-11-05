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

vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));
import { captureError } from '../../utils/sentry.js';

import { useAnchors } from '../useAnchors.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

function mockAnchors(data, error = null) {
  const chain = {
    select: () => chain,
    is: () => Promise.resolve({ data, error }),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
  captureError.mockClear();
});

async function renderAnchors(rows) {
  mockAnchors(rows);
  const hook = renderHook(() => useAnchors(), { wrapper: makeWrapper() });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  return hook;
}

const day = {
  cal: [1800, 2200],
  protein: [140, 160],
  carbs: [200, 250],
  fat: [50, 70],
};
const plan = {
  days: [{ day: 'Mon', train: 'Example', cal: 2000, p: 150, c: 220, f: 60 }],
};

describe('useAnchors', () => {
  it('resolves live cp/status and ftp from the current rows', async () => {
    mockAnchors([
      { key: 'rowing_cp', value: '200', unit: 'W', status: 'provisional' },
      { key: 'bike_ftp', value: '250', unit: 'W', status: 'unvalidated' },
    ]);
    const { result } = renderHook(() => useAnchors(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.cp).toBe(200);
    expect(result.current.cpStatus).toBe('provisional');
    expect(result.current.cpAvailable).toBe(true);
    expect(result.current.ftp).toBe(250);
    expect(result.current.ftpStatus).toBe('unvalidated');
  });

  it('reports cp unavailable when the rowing_cp row is absent', async () => {
    mockAnchors([{ key: 'current_phase', value: 'base' }]);
    const { result } = renderHook(() => useAnchors(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.cp).toBe(null);
    expect(result.current.cpAvailable).toBe(false);
  });

  it('guards a non-numeric value (text KV store) as unavailable', async () => {
    mockAnchors([{ key: 'rowing_cp', value: 'n/a', status: 'provisional' }]);
    const { result } = renderHook(() => useAnchors(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.cp).toBe(null);
    expect(result.current.cpAvailable).toBe(false);
    expect(result.current.cpStatus).toBe('provisional');
  });

  it('sets isError and null cp on a query error (no stale fallback)', async () => {
    mockAnchors(null, { message: 'boom' });
    const { result } = renderHook(() => useAnchors(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.cp).toBe(null);
    expect(result.current.cpAvailable).toBe(false);
  });

  // Synthetic values throughout — the real ones live only in the database.
  it('resolves the working MHR and its status', async () => {
    const { result } = await renderAnchors([
      {
        key: 'hr_max_working',
        value: '180',
        unit: 'bpm',
        status: 'unvalidated',
      },
    ]);
    expect(result.current.hrMax).toBe(180);
    expect(result.current.hrMaxStatus).toBe('unvalidated');
  });

  it('defaults every new field when the anchors are absent', async () => {
    const { result } = await renderAnchors([]);
    expect(result.current.hrMax).toBe(null);
    expect(result.current.hrMaxStatus).toBe(null);
    expect(result.current.niggles).toEqual([]);
    expect(result.current.nutritionTargets).toBe(null);
    expect(result.current.maintenancePlan).toBe(null);
    expect(result.current.deficitPlan).toBe(null);
    expect(result.current.parseErrors).toEqual([]);
    expect(captureError).not.toHaveBeenCalled();
  });

  it('lists niggle anchors newest first', async () => {
    const { result } = await renderAnchors([
      {
        key: 'niggle:a',
        value: 'Example A',
        note: 'n',
        valid_from: '2026-01-01',
      },
      { key: 'niggle:b', value: 'Example B', valid_from: '2026-02-01' },
    ]);
    expect(result.current.niggles.map((n) => n.slug)).toEqual(['b', 'a']);
  });

  it('parses valid JSON targets and plans', async () => {
    const { result } = await renderAnchors([
      {
        key: 'nutrition_targets',
        value: JSON.stringify({ rest: day }),
        unit: 'json',
      },
      { key: 'maintenance_plan', value: JSON.stringify(plan), unit: 'json' },
      {
        key: 'deficit_plan',
        value: JSON.stringify({
          ...plan,
          trigger: 'Example',
          rate: 'r',
          phase: 'p',
        }),
        unit: 'json',
      },
    ]);
    expect(result.current.nutritionTargets).toEqual({ rest: day });
    expect(result.current.maintenancePlan).toEqual(plan);
    expect(result.current.deficitPlan.trigger).toBe('Example');
    expect(result.current.parseErrors).toEqual([]);
  });

  it('nulls a malformed JSON anchor and reports it once', async () => {
    const { result, rerender } = await renderAnchors([
      { key: 'nutrition_targets', value: 'not json', unit: 'json' },
      {
        key: 'maintenance_plan',
        value: JSON.stringify({ days: [] }),
        unit: 'json',
      },
    ]);
    expect(result.current.nutritionTargets).toBe(null);
    expect(result.current.maintenancePlan).toBe(null);
    expect(result.current.parseErrors).toHaveLength(2);
    await waitFor(() => expect(captureError).toHaveBeenCalledTimes(2));
    rerender();
    rerender();
    expect(captureError).toHaveBeenCalledTimes(2);
    expect(captureError.mock.calls[0][1]).toEqual({
      source: 'useAnchors',
      op: 'parseJsonAnchor',
    });
  });
});
