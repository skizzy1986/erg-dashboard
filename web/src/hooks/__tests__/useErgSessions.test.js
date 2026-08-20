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

import { useErgSessions } from '../useErgSessions.js';
import { wattsToPace500 } from '../../utils/pace.js';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

// Both useErgSessions and its useAnchors dependency call supabase.from(); branch
// by table so the erg-session query and the live-CP anchor query each resolve.
function mockQuery(data, error = null, cp = 205) {
  fromMock.mockImplementation((table) => {
    if (table === 'anchors') {
      const chain = {
        select: () => chain,
        is: () =>
          Promise.resolve({
            data:
              cp == null
                ? []
                : [
                    {
                      key: 'rowing_cp',
                      value: String(cp),
                      status: 'provisional',
                    },
                  ],
            error: null,
          }),
      };
      return chain;
    }
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data, error }),
    };
    return chain;
  });
}

beforeEach(() => {
  fromMock.mockReset();
});

describe('useErgSessions', () => {
  it('computes pace, zone and pace string when avg_watts present', async () => {
    mockQuery([
      { id: 1, date: '2026-06-13', type: 'erg', avg_watts: 150, srpe: 6 },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data[0]?.zone).toBe('UT1'));
    const s = result.current.data[0];
    expect(s.pace_500m).toBeCloseTo(wattsToPace500(150), 5);
    expect(s.pace_500m_str).not.toBe('—');
  });

  it('leaves zone unset when Critical Power is unavailable', async () => {
    mockQuery(
      [{ id: 8, date: '2026-06-13', type: 'erg', avg_watts: 150, srpe: 6 }],
      null,
      null
    );
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const s = result.current.data[0];
    expect(s.zone).toBe(null);
    expect(s.pace_500m).not.toBe(null);
  });

  it('falls back to distance/duration pace when no watts', async () => {
    mockQuery([
      {
        id: 2,
        date: '2026-06-13',
        type: 'erg',
        avg_watts: null,
        distance_m: 10000,
        duration: 45,
      },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const s = result.current.data[0];
    expect(s.pace_500m).not.toBe(null);
    expect(s.zone).toBe(null);
  });

  it('yields null pace and zone with no watts and no distance', async () => {
    mockQuery([{ id: 3, date: '2026-06-13', type: 'erg', avg_watts: null }]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const s = result.current.data[0];
    expect(s.pace_500m).toBe(null);
    expect(s.zone).toBe(null);
    expect(s.pace_500m_str).toBe('—');
  });

  it('flags hardPush when srpe >= 7', async () => {
    mockQuery([
      { id: 4, date: '2026-06-13', type: 'erg', avg_watts: 150, srpe: 8 },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].hardPush).toBe(true);
  });

  it('does not flag hardPush when srpe < 7', async () => {
    mockQuery([
      { id: 5, date: '2026-06-13', type: 'erg', avg_watts: 150, srpe: 6 },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].hardPush).toBe(false);
  });

  it('does not flag hardPush when srpe is null', async () => {
    mockQuery([
      { id: 6, date: '2026-06-13', type: 'erg', avg_watts: 150, srpe: null },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].hardPush).toBe(false);
  });

  it('formats date_display as M/D', async () => {
    mockQuery([{ id: 7, date: '2026-06-13', type: 'erg', avg_watts: 150 }]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].date_display).toBe('6/13');
  });

  // sessions.date is TEXT "M/D/YY" in production — the fixtures above are ISO
  // only because the read side used to assume it. These cover the live format.
  it('formats date_display as M/D from the live M/D/YY text format', async () => {
    mockQuery([{ id: 9, date: '8/7/26', type: 'erg', avg_watts: 150 }]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].date_display).toBe('8/7');
  });

  it('strips the zero padding from a padded MM/DD/YY date', async () => {
    mockQuery([{ id: 10, date: '06/09/26', type: 'erg', avg_watts: 150 }]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].date_display).toBe('6/9');
  });

  it('falls back to the raw date string when it cannot be parsed', async () => {
    mockQuery([{ id: 11, date: 'not-a-date', type: 'erg', avg_watts: 150 }]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].date_display).toBe('not-a-date');
  });

  // Postgres sorts the TEXT date lexically, so it hands back "12/31/25" above
  // "1/1/26". The hook must re-sort newest-first on the normalized key.
  it('re-sorts newest-first across a year boundary', async () => {
    mockQuery([
      { id: 12, date: '12/31/25', type: 'erg', avg_watts: 150 },
      { id: 13, date: '1/1/26', type: 'erg', avg_watts: 150 },
      { id: 14, date: '2/14/26', type: 'erg', avg_watts: 150 },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.map((s) => s.date)).toEqual([
      '2/14/26',
      '1/1/26',
      '12/31/25',
    ]);
  });

  it('sorts ISO and M/D/YY dates into one correct order', async () => {
    mockQuery([
      { id: 15, date: '2026-06-13', type: 'erg', avg_watts: 150 },
      { id: 16, date: '8/7/26', type: 'erg', avg_watts: 150 },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.map((s) => s.id)).toEqual([16, 15]);
  });

  it('sets isError on supabase error', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
