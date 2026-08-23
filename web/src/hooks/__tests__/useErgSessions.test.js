import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();
const eqMock = vi.fn();
const inMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useErgSessions } from '../useErgSessions.js';
import { wattsToPace500 } from '../../utils/pace.js';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';

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
      eq: (...args) => {
        eqMock(...args);
        return chain;
      },
      in: (...args) => {
        inMock(...args);
        return chain;
      },
      order: (...args) => {
        orderMock(...args);
        return chain;
      },
      limit: (...args) => {
        limitMock(...args);
        return Promise.resolve({ data, error });
      },
    };
    return chain;
  });
}

beforeEach(() => {
  fromMock.mockReset();
  orderMock.mockReset();
  limitMock.mockReset();
  eqMock.mockReset();
  inMock.mockReset();
});

describe('useErgSessions — the completed-status filter (#206)', () => {
  // The live table holds 35 'actual' + 23 'completed' rows and ZERO 'logged'
  // ones, so `.eq('status','logged')` matched nothing and ErgView rendered an
  // empty list while 23 erg sessions sat in the database.
  it('filters on every completed status, not just one', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inMock).toHaveBeenCalledWith('status', COMPLETED_STATUSES);
  });

  it('never narrows the query to a single status', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqMock).not.toHaveBeenCalledWith('status', expect.anything());
  });

  it('returns bulk-imported history that carries actual/completed', async () => {
    mockQuery([
      { id: 1, date: '6/23/26', type: 'erg', label: 'a', status: 'actual' },
      { id: 2, date: '6/24/26', type: 'erg', label: 'b', status: 'completed' },
      { id: 3, date: '6/25/26', type: 'erg', label: 'c', status: 'logged' },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.map((s) => s.status)).toEqual([
      'logged',
      'completed',
      'actual',
    ]);
  });
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

  // The DB returns date_iso order; these fixtures are deliberately scrambled to
  // pin the client-side guard that survives a rollback or a stale PostgREST
  // schema cache. They are NOT evidence the server order is wrong.
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

  it('orders on the derived date_iso column with NULLS LAST', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orderMock).toHaveBeenCalledWith('date_iso', {
      ascending: false,
      nullsFirst: false,
    });
  });

  it('never orders on the lexically-sorting text date column (#187)', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orderMock).not.toHaveBeenCalledWith('date', expect.anything());
  });

  it('breaks ties on id so the limit boundary is deterministic', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orderMock).toHaveBeenCalledWith('id', { ascending: false });
  });

  it('requests a 50-row recency window', async () => {
    mockQuery([]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it('sorts an unparseable date last, mirroring NULLS LAST', async () => {
    mockQuery([
      { id: 17, date: 'garbage', type: 'erg', avg_watts: 150 },
      { id: 18, date: '8/7/26', type: 'erg', avg_watts: 150 },
      { id: 19, date: '5/22/26', type: 'erg', avg_watts: 150 },
    ]);
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.map((s) => s.date)).toEqual([
      '8/7/26',
      '5/22/26',
      'garbage',
    ]);
  });

  it('sets isError on supabase error', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useErgSessions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
