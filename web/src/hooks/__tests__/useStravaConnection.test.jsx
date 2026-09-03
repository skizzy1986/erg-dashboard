import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fromMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

import { useStravaConnection } from '../useStravaConnection.js';

function wrapper({ children }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
}

function mockRow(data, error = null) {
  const chain = {
    select: () => chain,
    maybeSingle: () => Promise.resolve({ data, error }),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
});

describe('useStravaConnection', () => {
  it('reads strava_sync_state and derives the status kind', async () => {
    mockRow({
      connected: true,
      backfill_complete: true,
      last_run_status: 'ok',
      last_run_at: new Date().toISOString(),
      imported_total: 4,
      failed_total: 0,
      ambiguous_activity_ids: [],
    });
    const { result } = renderHook(() => useStravaConnection(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('strava_sync_state');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.statusKind).toBe('healthy');
  });

  it('resolves a missing row to null, not an error', async () => {
    mockRow(null);
    const { result } = renderHook(() => useStravaConnection(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.connection).toBe(null);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.statusKind).toBe('not_connected');
  });

  it('surfaces a query failure as isError, NOT as not_connected', async () => {
    mockRow(null, { message: 'permission denied for table strava_sync_state' });
    const { result } = renderHook(() => useStravaConnection(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.statusKind).not.toBe('not_connected');
    expect(result.current.statusKind).toBe(null);
    expect(result.current.status).toBe(null);
    expect(result.current.isConnected).toBe(false);
  });
});
