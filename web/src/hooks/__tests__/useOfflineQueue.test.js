import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the supabase client before importing the hook under test.
const insertMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: { getUser: (...args) => getUserMock(...args) },
    from: () => ({ insert: (...args) => insertMock(...args) }),
  },
}));

import { enqueueSession, useOfflineQueue } from '../useOfflineQueue';

const QUEUE_KEY = 'erg_pending_sessions';

beforeEach(() => {
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

    renderHook(() => useOfflineQueue());

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

    renderHook(() => useOfflineQueue());

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0][0].user_id).toBe('original-owner');
  });

  it('uses undefined user_id when no auth user is available rather than throwing', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    enqueueSession({ date: '2026-06-25', type: 'erg' });

    renderHook(() => useOfflineQueue());

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock.mock.calls[0][0].user_id).toBeUndefined();
  });

  it('retains rows that fail to insert so they can be retried', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    insertMock.mockResolvedValue({ error: { message: 'network' } });
    enqueueSession({ date: '2026-06-25', type: 'erg' });

    renderHook(() => useOfflineQueue());

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const remaining = JSON.parse(localStorage.getItem(QUEUE_KEY));
    expect(remaining).toHaveLength(1);
  });
});
