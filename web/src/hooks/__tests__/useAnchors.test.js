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
});

describe('useAnchors', () => {
  it('resolves live cp/status and ftp from the current rows', async () => {
    mockAnchors([
      { key: 'rowing_cp', value: '205', unit: 'W', status: 'provisional' },
      { key: 'bike_ftp', value: '250', unit: 'W', status: 'unvalidated' },
    ]);
    const { result } = renderHook(() => useAnchors(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.cp).toBe(205);
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
});
