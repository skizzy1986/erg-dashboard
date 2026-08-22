import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the supabase client before importing the hook under test.
const insertMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: { getUser: (...args) => getUserMock(...args) },
    from: () => ({ insert: (...args) => insertMock(...args) }),
  },
}));

import {
  enqueueSession,
  useOfflineQueue,
  normalizeQueuedSession,
} from '../useOfflineQueue';

const QUEUE_KEY = 'erg_pending_sessions';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function makeWrapper(client) {
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(async () => {
  // drainQueue holds a module-level in-flight guard; let any drain started by
  // the previous test settle before resetting shared state.
  await new Promise((resolve) => setTimeout(resolve, 0));
  localStorage.clear();
  insertMock.mockReset();
  getUserMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  // navigator.onLine defaults to true under jsdom; ensure drain runs.
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  });
});

describe('useOfflineQueue drainQueue user_id backfill', () => {
  it('backfills user_id from the authenticated user when the queued row lacks one', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    enqueueSession({ date: '2026-06-25', type: 'erg', label: 'Test' });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const row = insertMock.mock.calls[0][0];
    expect(row.user_id).toBe('user-123');
    // The transient queue marker must be stripped before insert.
    expect(row._queuedAt).toBeUndefined();
    // Successful drain empties the queue.
    expect(localStorage.getItem(QUEUE_KEY)).toBe('[]');
  });

  it('preserves an existing user_id on the queued row over the auth fallback', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-fallback' } } });
    enqueueSession({
      date: '2026-06-25',
      type: 'erg',
      user_id: 'original-owner',
    });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0][0].user_id).toBe('original-owner');
  });

  it('uses undefined user_id when no auth user is available rather than throwing', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    enqueueSession({ date: '2026-06-25', type: 'erg' });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0][0].user_id).toBeUndefined();
  });

  it('retains rows that fail to insert so they can be retried', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock.mockResolvedValue({
      error: { code: '08006', message: 'network' },
    });
    enqueueSession({ date: '2026-06-25', type: 'erg' });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const remaining = JSON.parse(localStorage.getItem(QUEUE_KEY));
    expect(remaining).toHaveLength(1);
  });
});

describe('normalizeQueuedSession', () => {
  it('renames legacy columns that do not exist on the sessions table', () => {
    expect(
      normalizeQueuedSession({
        date: '2026-06-25',
        watts: 180,
        distance: 5000,
        duration: 20,
      })
    ).toEqual({
      date: '6/25/26',
      avg_watts: 180,
      distance_m: 5000,
      duration: '20',
    });
  });

  it('preserves _queuedAt and unknown keys', () => {
    const out = normalizeQueuedSession({
      _queuedAt: 1234,
      srpe: 5,
      somethingNew: 'keep me',
      watts: 200,
    });
    expect(out._queuedAt).toBe(1234);
    expect(out.srpe).toBe(5);
    expect(out.somethingNew).toBe('keep me');
    expect(out.avg_watts).toBe(200);
  });

  it('is idempotent', () => {
    const once = normalizeQueuedSession({
      date: '2026-06-25',
      watts: 180,
      distance: 5000,
      duration: 20,
    });
    expect(normalizeQueuedSession(once)).toEqual(once);
  });

  it('does not clobber a modern value with the legacy one', () => {
    const out = normalizeQueuedSession({
      watts: 999,
      avg_watts: 180,
      distance: 999,
      distance_m: 5000,
    });
    expect(out.avg_watts).toBe(180);
    expect(out.distance_m).toBe(5000);
    expect(out).not.toHaveProperty('watts');
    expect(out).not.toHaveProperty('distance');
  });

  it('leaves a missing date alone rather than inventing today', () => {
    expect(normalizeQueuedSession({ type: 'erg' })).toEqual({ type: 'erg' });
  });
});

describe('useOfflineQueue legacy-row migration', () => {
  it('drains a legacy-shaped row using the real sessions columns', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    enqueueSession({
      date: '2026-06-25',
      type: 'erg',
      label: 'Erg Session',
      watts: 180,
      distance: 5000,
    });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const row = insertMock.mock.calls[0][0];
    expect(row.avg_watts).toBe(180);
    expect(row.distance_m).toBe(5000);
    expect(row.date).toBe('6/25/26');
    expect(row).not.toHaveProperty('watts');
    expect(row).not.toHaveProperty('distance');
  });

  it('rewrites storage in the normalized shape when the drain fails', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock.mockResolvedValue({
      error: { code: '08006', message: 'network' },
    });
    enqueueSession({
      date: '2026-06-25',
      type: 'erg',
      watts: 180,
      distance: 5000,
    });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const [remaining] = JSON.parse(localStorage.getItem(QUEUE_KEY));
    expect(remaining.avg_watts).toBe(180);
    expect(remaining.distance_m).toBe(5000);
    expect(remaining.date).toBe('6/25/26');
    expect(remaining).not.toHaveProperty('watts');
    expect(remaining._queuedAt).toEqual(expect.any(Number));
  });

  it('drops a row the server rejects as a duplicate', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock.mockResolvedValue({
      error: { code: '23505', message: 'duplicate key value violates …' },
    });
    enqueueSession({
      date: '6/25/26',
      type: 'erg',
      label: 'Erg Session 07:15',
    });

    const { result } = renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.pending).toBe(0));
    expect(localStorage.getItem(QUEUE_KEY)).toBe('[]');
  });

  it('inserts each row at most once when two drains race', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    let release;
    insertMock.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({ error: null })))
    );
    enqueueSession({
      date: '6/25/26',
      type: 'erg',
      label: 'Erg Session 07:15',
    });

    renderHook(() => useOfflineQueue(), {
      wrapper: makeWrapper(makeClient()),
    });
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    // A second trigger while the first drain is still awaiting the insert.
    window.dispatchEvent(new window.Event('online'));
    await Promise.resolve();
    release();

    await waitFor(() => expect(localStorage.getItem(QUEUE_KEY)).toBe('[]'));
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});

describe('useOfflineQueue drain invalidation', () => {
  it('invalidates every session-reading query once after a successful drain', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'Erg Session' });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useOfflineQueue(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(3));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['erg-sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tss-history'] });
  });

  it('invalidates nothing when the queue is empty', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useOfflineQueue(), { wrapper: makeWrapper(client) });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(insertMock).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('invalidates nothing when every queued row fails to insert', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock.mockResolvedValue({
      error: { code: '08006', message: 'network' },
    });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'A' });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'B' });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useOfflineQueue(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(QUEUE_KEY))).toHaveLength(2);
  });

  it('invalidates once after the loop, not once per drained row', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'A' });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'B' });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'C' });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useOfflineQueue(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(3));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invalidateSpy).toHaveBeenCalledTimes(3);
  });

  it('still invalidates on a partial drain and retains the failed row', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '08006', message: 'network' } });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'lands' });
    enqueueSession({ date: '6/25/26', type: 'erg', label: 'fails' });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useOfflineQueue(), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(3));
    const remaining = JSON.parse(localStorage.getItem(QUEUE_KEY));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe('fails');
  });
});
