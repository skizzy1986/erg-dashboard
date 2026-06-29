import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks for supabase + the two hooks ErgLiveView depends on.
const insertMock = vi.fn();
const getUserMock = vi.fn();
const addToQueueMock = vi.fn();
const resetMock = vi.fn();

let pm5State;

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
  useOfflineQueue: () => ({ addToQueue: addToQueueMock }),
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

beforeEach(() => {
  insertMock.mockReset();
  getUserMock.mockReset();
  addToQueueMock.mockReset();
  resetMock.mockReset();
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
  };
});

describe('ErgLiveView', () => {
  it('renders the connect screen when idle', () => {
    renderWithClient(<ErgLiveView />, makeClient());
    expect(screen.getByText('C2 CONNECT')).toBeInTheDocument();
    expect(screen.getByText('CONNECT TO PM5')).toBeInTheDocument();
  });

  it('renders the summary screen when a session is finished', () => {
    pm5State = { ...pm5State, status: 'finished', summary: SUMMARY };
    renderWithClient(<ErgLiveView />, makeClient());
    expect(screen.getByText('SESSION COMPLETE')).toBeInTheDocument();
    expect(screen.getByText('SAVE SESSION')).toBeInTheDocument();
  });

  it('saves an erg session and invalidates the sessions query on success', async () => {
    pm5State = { ...pm5State, status: 'finished', summary: SUMMARY };
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const onSessionSaved = vi.fn();
    renderWithClient(<ErgLiveView onSessionSaved={onSessionSaved} />, client);

    fireEvent.click(screen.getByText('SAVE SESSION'));

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['erg-sessions'] });
    expect(resetMock).toHaveBeenCalled();
    expect(onSessionSaved).toHaveBeenCalledTimes(1);

    const row = insertMock.mock.calls[0][0];
    expect(row.type).toBe('erg');
    expect(row.status).toBe('logged');
    expect(row.distance).toBe(5000);
    expect(row.user_id).toBe('user-123');
  });

  it('queues the row instead of failing when the insert errors', async () => {
    insertMock.mockResolvedValue({ error: { message: 'db down' } });
    pm5State = { ...pm5State, status: 'finished', summary: SUMMARY };
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderWithClient(<ErgLiveView />, client);

    fireEvent.click(screen.getByText('SAVE SESSION'));

    await waitFor(() => expect(addToQueueMock).toHaveBeenCalledTimes(1));
    // mutationFn resolves (no throw), so success path still runs.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['erg-sessions'] });
  });

  it('queues the row when offline without attempting an insert', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    pm5State = { ...pm5State, status: 'finished', summary: SUMMARY };
    renderWithClient(<ErgLiveView />, makeClient());

    fireEvent.click(screen.getByText('SAVE SESSION'));

    await waitFor(() => expect(addToQueueMock).toHaveBeenCalledTimes(1));
    expect(insertMock).not.toHaveBeenCalled();
  });
});
