import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks for supabase + the two hooks ErgLiveView depends on.
const insertMock = vi.fn();
const getUserMock = vi.fn();
const addToQueueMock = vi.fn();
const resetMock = vi.fn();
const finishMock = vi.fn();

let pm5State;
let queueState;

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: { getUser: (...args) => getUserMock(...args) },
    from: () => ({ insert: (...args) => insertMock(...args) }),
  },
}));

vi.mock('../../hooks/usePM5', () => ({
  usePM5: () => pm5State,
}));

vi.mock('../../hooks/useOfflineQueue', () => ({
  useOfflineQueue: () => queueState,
}));

import ErgLiveView from '../ErgLiveView.jsx';

const SUMMARY = {
  distance: 5000,
  elapsedTime: 1200,
  elapsedStr: '20:00',
  avgWatts: 180,
  avgPace: 120,
  avgSpm: 24,
  maxWatts: 220,
  calories: 250,
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithClient(ui, client) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

function finished(extra = {}) {
  pm5State = { ...pm5State, status: 'finished', summary: SUMMARY, ...extra };
}

async function save() {
  fireEvent.click(screen.getByText('SAVE SESSION'));
  await waitFor(() =>
    expect(
      insertMock.mock.calls.length + addToQueueMock.mock.calls.length
    ).toBeGreaterThan(0)
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 18, 7, 15));
  insertMock.mockReset();
  getUserMock.mockReset();
  addToQueueMock.mockReset();
  resetMock.mockReset();
  finishMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  insertMock.mockResolvedValue({ error: null });
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  });
  pm5State = {
    status: 'idle',
    metrics: null,
    summary: null,
    error: null,
    connect: vi.fn(),
    reset: resetMock,
    finish: finishMock,
  };
  queueState = { addToQueue: addToQueueMock, pending: 0 };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ErgLiveView', () => {
  it('renders the connect screen when idle', () => {
    renderWithClient(<ErgLiveView />, makeClient());
    expect(screen.getByText('C2 CONNECT')).toBeInTheDocument();
    expect(screen.getByText('CONNECT TO PM5')).toBeInTheDocument();
  });

  it('renders the summary screen when a session is finished', () => {
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    expect(screen.getByText('SESSION COMPLETE')).toBeInTheDocument();
    expect(screen.getByText('SAVE SESSION')).toBeInTheDocument();
  });

  it('shows the pending-sync count on the connect screen', () => {
    queueState = { ...queueState, pending: 3 };
    renderWithClient(<ErgLiveView />, makeClient());
    expect(screen.getByText('3 PENDING SYNC')).toBeInTheDocument();
  });

  it('tolerates a queue hook that reports no pending count', () => {
    queueState = { addToQueue: addToQueueMock };
    renderWithClient(<ErgLiveView />, makeClient());
    expect(screen.queryByText(/PENDING SYNC/)).not.toBeInTheDocument();
  });
});

describe('ErgLiveView save row', () => {
  it('inserts exactly the columns the sessions table has', async () => {
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    const row = insertMock.mock.calls[0][0];
    expect(row).toEqual({
      date: '8/18/26',
      type: 'erg',
      label: 'Erg Session 07:15',
      duration: '20:00',
      srpe: 5,
      distance_m: 5000,
      avg_watts: 180,
      status: 'logged',
      source: 'bluetooth',
      exercises: [],
      user_id: 'user-123',
    });
    // Columns that do not exist on `sessions` must never be sent — the insert
    // is rejected wholesale if they are.
    expect(row).not.toHaveProperty('watts');
    expect(row).not.toHaveProperty('distance');
    // The PM5 General Status packet carries no heart rate.
    expect(row).not.toHaveProperty('avg_hr');
  });

  it('writes the date as unpadded M/D/YY text', async () => {
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();
    expect(insertMock.mock.calls[0][0].date).toMatch(
      /^\d{1,2}\/\d{1,2}\/\d{2}$/
    );
  });

  it('writes duration as MM:SS text rather than a number of minutes', async () => {
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();
    expect(insertMock.mock.calls[0][0].duration).toBe('20:00');
  });

  it('carries the notes through as an exercises entry', async () => {
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    fireEvent.change(screen.getByPlaceholderText(/How did it feel/), {
      target: { value: 'legs felt good' },
    });
    await save();
    expect(insertMock.mock.calls[0][0].exercises).toEqual([
      { name: 'Notes', notes: 'legs felt good' },
    ]);
  });

  it('nulls unmeasured metrics instead of writing zeroes, and survives no auth user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    pm5State = {
      ...pm5State,
      status: 'finished',
      summary: {
        distance: 0,
        elapsedTime: 0,
        elapsedStr: '00:00',
        avgWatts: 0,
        avgPace: 0,
        avgSpm: 0,
        maxWatts: 0,
        calories: 0,
      },
    };
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    const row = insertMock.mock.calls[0][0];
    expect(row.distance_m).toBeNull();
    expect(row.avg_watts).toBeNull();
    expect(row.duration).toBe('00:00');
    expect(row.exercises).toEqual([]);
    expect(row.user_id).toBeUndefined();
  });
});

describe('ErgLiveView planned-session matching', () => {
  const planned = {
    date: '8/18/26',
    _isErg: true,
    type: 'Z2 Aerobic',
    label: 'UT1 Steady 50min',
    status: 'planned',
  };

  it("labels the row from today's planned erg session", async () => {
    finished();
    renderWithClient(<ErgLiveView plannedSessions={[planned]} />, makeClient());
    await save();
    expect(insertMock.mock.calls[0][0].label).toBe('UT1 Steady 50min 07:15');
  });

  it('ignores a planned session on another date', async () => {
    finished();
    renderWithClient(
      <ErgLiveView plannedSessions={[{ ...planned, date: '8/17/26' }]} />,
      makeClient()
    );
    await save();
    expect(insertMock.mock.calls[0][0].label).toBe('Erg Session 07:15');
  });

  it('ignores a planned session for another modality', async () => {
    finished();
    renderWithClient(
      <ErgLiveView
        plannedSessions={[{ ...planned, _isErg: false, _isCycling: true }]}
      />,
      makeClient()
    );
    await save();
    expect(insertMock.mock.calls[0][0].label).toBe('Erg Session 07:15');
  });

  it('gives two sessions on the same day distinct labels', async () => {
    finished();
    const first = renderWithClient(<ErgLiveView />, makeClient());
    await save();
    first.unmount();

    vi.setSystemTime(new Date(2026, 7, 18, 17, 40));
    renderWithClient(<ErgLiveView />, makeClient());
    await waitFor(() => expect(screen.getByText('SAVE SESSION')).toBeVisible());
    fireEvent.click(screen.getByText('SAVE SESSION'));
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(2));

    const [a, b] = insertMock.mock.calls.map(([row]) => row);
    expect(a.date).toBe(b.date);
    expect(a.label).not.toBe(b.label);
    expect(b.label).toBe('Erg Session 17:40');
  });
});

describe('ErgLiveView save outcomes', () => {
  it('reports success, refreshes the log queries and does not queue', async () => {
    finished();
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderWithClient(<ErgLiveView />, client);
    await save();

    await waitFor(() =>
      expect(screen.getByText('SAVED TO LOG')).toBeInTheDocument()
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['erg-sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tss-history'] });
    expect(addToQueueMock).not.toHaveBeenCalled();
  });

  it('queues the row and says so when the insert is rejected', async () => {
    insertMock.mockResolvedValue({
      error: { code: '42501', message: 'permission denied' },
    });
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    expect(addToQueueMock).toHaveBeenCalledTimes(1);
    expect(addToQueueMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        date: '8/18/26',
        label: 'Erg Session 07:15',
        duration: '20:00',
        distance_m: 5000,
        avg_watts: 180,
        status: 'logged',
      })
    );
    await waitFor(() =>
      expect(screen.getByText('SAVED LOCALLY — WILL SYNC')).toBeInTheDocument()
    );
    expect(screen.queryByText('SAVED TO LOG')).not.toBeInTheDocument();
  });

  it('queues without attempting an insert when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    expect(addToQueueMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText('SAVED LOCALLY — WILL SYNC')).toBeInTheDocument()
    );
  });

  it('treats a duplicate-key rejection as saved rather than queueing it', async () => {
    insertMock.mockResolvedValue({
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    });
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    expect(addToQueueMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText('SAVED TO LOG')).toBeInTheDocument()
    );
  });

  it('queues when the auth lookup itself rejects', async () => {
    getUserMock.mockRejectedValue(new Error('no session'));
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    expect(insertMock).not.toHaveBeenCalled();
    expect(addToQueueMock).toHaveBeenCalledTimes(1);
    expect(addToQueueMock.mock.calls[0][0].user_id).toBeUndefined();
  });

  it('surfaces a failure when the row cannot even be stored locally', async () => {
    insertMock.mockResolvedValue({ error: { code: '42501', message: 'nope' } });
    addToQueueMock.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    await waitFor(() =>
      expect(screen.getByText(/SAVE FAILED/)).toBeInTheDocument()
    );
    expect(screen.queryByText('SAVED TO LOG')).not.toBeInTheDocument();
    expect(
      screen.queryByText('SAVED LOCALLY — WILL SYNC')
    ).not.toBeInTheDocument();
    // The session is still on screen, so the data is not lost — retry is possible.
    expect(screen.getByText('SAVE SESSION')).toBeInTheDocument();
  });
});

describe('ErgLiveView post-save flow', () => {
  it('keeps the summary on screen until DONE is pressed', async () => {
    finished();
    const onSessionSaved = vi.fn();
    renderWithClient(
      <ErgLiveView onSessionSaved={onSessionSaved} />,
      makeClient()
    );
    await save();

    await waitFor(() =>
      expect(screen.getByText('SAVED TO LOG')).toBeInTheDocument()
    );
    expect(resetMock).not.toHaveBeenCalled();
    expect(onSessionSaved).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('DONE'));
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(onSessionSaved).toHaveBeenCalledTimes(1);
  });

  it('offers DONE after a queued save too', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();

    await waitFor(() => expect(screen.getByText('DONE')).toBeInTheDocument());
    expect(screen.queryByText('SAVE SESSION')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('DONE'));
    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});

describe('ErgLiveView manual end', () => {
  it('routes END into the summary screen instead of discarding the session', () => {
    pm5State = {
      ...pm5State,
      status: 'rowing',
      metrics: {
        watts: 180,
        strokeRate: 24,
        distance: 5000,
        elapsedStr: '20:00',
      },
    };
    const { rerender } = renderWithClient(<ErgLiveView />, makeClient());

    fireEvent.click(screen.getByText('END'));
    expect(finishMock).toHaveBeenCalledTimes(1);
    expect(resetMock).not.toHaveBeenCalled();

    // usePM5.finish() flips status to 'finished' with a summary.
    finished();
    const client = makeClient();
    rerender(
      <QueryClientProvider client={client}>
        <ErgLiveView />
      </QueryClientProvider>
    );
    expect(screen.getByText('SESSION COMPLETE')).toBeInTheDocument();
  });

  it('saves a manually-ended session through the same flow', async () => {
    finished();
    renderWithClient(<ErgLiveView />, makeClient());
    await save();
    await waitFor(() =>
      expect(screen.getByText('SAVED TO LOG')).toBeInTheDocument()
    );
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
