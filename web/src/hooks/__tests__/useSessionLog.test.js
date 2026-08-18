import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const fromMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

import { useSessionLog } from '../useSessionLog.js';

function mockQuery(data, error = null) {
  const chain = {
    select: () => chain,
    order: () => Promise.resolve({ data, error }),
  };
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  fromMock.mockReset();
});

const ergRow = {
  id: 1,
  date: '06/13/26',
  type: 'erg',
  label: '10k steady',
  duration: 45,
  srpe: 6,
  prs: null,
  exercises: null,
  coach_note: 'keep it easy',
  status: 'completed',
  distance_m: 10000,
  avg_watts: 150,
  avg_hr: 135,
};

describe('useSessionLog', () => {
  it('maps rows, filters Test type, and sets dbStatus ok on success', async () => {
    mockQuery([
      ergRow,
      { id: 2, date: '06/14/26', type: 'Test', label: 'CP test' },
      {
        id: 3,
        date: '06/15/26',
        type: 'cycling',
        label: 'z2 spin',
        status: null,
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    const sessions = result.current.allSessions;
    expect(sessions).toHaveLength(2);
    const erg = sessions[0];
    expect(erg.type).toBe('Z2 Aerobic');
    expect(erg.coachNote).toBe('keep it easy');
    expect(erg.exercises).toBe(undefined);
    expect(erg._isErg).toBe(true);
    expect(erg._isCycling).toBe(false);
    expect(erg._fromDb).toBe(true);
    expect(erg._id).toBe(1);
    const bike = sessions[1];
    expect(bike._isErg).toBe(false);
    expect(bike._isCycling).toBe(true);
    expect(bike.status).toBe(null);
  });

  it('sets dbStatus error and falls back to the seed on supabase error', async () => {
    mockQuery(null, { message: 'boom' });
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('error'));
    expect(result.current.allSessions).toEqual([]);
  });

  it('splits planned vs logged and builds loggedKeys from logged only', async () => {
    mockQuery([
      {
        id: 1,
        date: '06/20/26',
        type: 'erg',
        label: 'plan',
        status: 'planned',
      },
      {
        id: 2,
        date: '06/13/26',
        type: 'erg',
        label: 'done',
        status: 'completed',
      },
      {
        id: 3,
        date: '06/12/26',
        type: 'strength',
        label: 'Upper A',
        status: null,
      },
    ]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.dbStatus).toBe('ok'));
    expect(result.current.plannedSessions).toHaveLength(1);
    expect(result.current.plannedSessions[0]._id).toBe(1);
    expect(result.current.loggedSessions).toHaveLength(2);
    expect(result.current.loggedKeys.has('06/13/26|Z2 Aerobic')).toBe(true);
    expect(result.current.loggedKeys.has('06/12/26|Upper Strength')).toBe(true);
    expect(result.current.loggedKeys.has('06/20/26|Z2 Aerobic')).toBe(false);
  });

  it('fetchSessions refetch updates state', async () => {
    mockQuery([ergRow]);
    const { result } = renderHook(() => useSessionLog());
    await waitFor(() => expect(result.current.allSessions).toHaveLength(1));
    mockQuery([
      ergRow,
      { id: 4, date: '06/16/26', type: 'erg', label: 'new', status: 'logged' },
    ]);
    act(() => {
      result.current.fetchSessions();
    });
    await waitFor(() => expect(result.current.allSessions).toHaveLength(2));
    expect(result.current.allSessions[1]._id).toBe(4);
  });
});
