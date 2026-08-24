import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  queries: [],
  listener: null,
  unsubscribe: null,
}));

vi.mock('@tanstack/react-query', () => {
  const cache = {
    getAll: () => mocks.queries,
    subscribe: (fn) => {
      mocks.listener = fn;
      return mocks.unsubscribe;
    },
  };
  const client = { getQueryCache: () => cache };
  return { useQueryClient: () => client };
});

import { useInitialDataReady } from '../useInitialDataReady.js';

const q = (status, fetchStatus) => ({ state: { status, fetchStatus } });

beforeEach(() => {
  mocks.queries = [];
  mocks.listener = null;
  mocks.unsubscribe = vi.fn();
});

describe('useInitialDataReady', () => {
  it('stays false while the cache is empty', () => {
    const { result } = renderHook(() => useInitialDataReady());
    expect(result.current).toBe(false);
  });

  it('stays false while a first fetch is in flight', () => {
    mocks.queries = [q('pending', 'fetching')];
    const { result } = renderHook(() => useInitialDataReady());
    expect(result.current).toBe(false);
  });

  it('latches once the in-flight fetch settles', () => {
    mocks.queries = [q('pending', 'fetching')];
    const { result } = renderHook(() => useInitialDataReady());
    expect(result.current).toBe(false);

    mocks.queries = [q('success', 'idle')];
    act(() => mocks.listener());
    expect(result.current).toBe(true);
  });

  it('latches immediately on a warm cache that never fetches', () => {
    mocks.queries = [q('success', 'idle')];
    const { result } = renderHook(() => useInitialDataReady());
    expect(result.current).toBe(true);
  });

  it('latches on an errored first fetch — a failure must not block the splash', () => {
    mocks.queries = [q('error', 'idle')];
    const { result } = renderHook(() => useInitialDataReady());
    expect(result.current).toBe(true);
  });

  it('unsubscribes once latched and never goes back to false', () => {
    mocks.queries = [q('pending', 'fetching')];
    const { result, rerender } = renderHook(() => useInitialDataReady());

    mocks.queries = [q('success', 'idle')];
    act(() => mocks.listener());
    expect(result.current).toBe(true);
    expect(mocks.unsubscribe).toHaveBeenCalled();

    mocks.queries = [q('pending', 'fetching')];
    rerender();
    expect(result.current).toBe(true);
  });
});
