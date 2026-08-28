import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const connectionMock = vi.fn();
const startMutate = vi.fn();
const requestDisconnect = vi.fn();
const syncMutate = vi.fn();
const syncFactory = vi.fn();

vi.mock('../../hooks/useStravaConnection.js', () => ({
  useStravaConnection: () => connectionMock(),
}));
vi.mock('../../hooks/useStravaConnect.js', () => ({
  useStravaConnect: () => ({
    start: { mutate: startMutate, isPending: false, isError: false },
    disconnect: { isPending: false },
    requestDisconnect,
  }),
}));
vi.mock('../../hooks/useStravaSync.js', () => ({
  useStravaSync: (opts) => {
    syncFactory(opts);
    return { mutate: syncMutate, isPending: false, isError: false };
  },
}));

import StravaConnectPanel from '../StravaConnectPanel.jsx';
import { describeConnection } from '../../utils/stravaStatus.js';

// The panel is driven entirely by describeConnection's output, so the fixtures
// are real rows put through the real util — a wrong precedence in the util
// shows up here as the wrong buttons rather than passing on a hand-written stub.
function connected(over = {}) {
  return {
    connected: true,
    backfill_complete: true,
    last_run_at: new Date().toISOString(),
    last_run_status: 'ok',
    imported_total: 5,
    adopted_total: 0,
    failed_total: 0,
    ambiguous_activity_ids: [],
    ...over,
  };
}

function mockState(row, extra = {}) {
  connectionMock.mockReturnValue({
    connection: row,
    status: describeConnection(row, new Date()),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...extra,
  });
}

beforeEach(() => {
  connectionMock.mockReset();
  startMutate.mockReset();
  requestDisconnect.mockReset();
  syncMutate.mockReset();
  syncFactory.mockReset();
});

describe('StravaConnectPanel', () => {
  it('offers Connect and nothing else when disconnected', async () => {
    mockState(null);
    render(<StravaConnectPanel />);
    expect(screen.getByText(/Strava not connected/i)).toBeInTheDocument();

    const connect = screen.getByRole('button', { name: 'Connect Strava' });
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();

    await userEvent.click(connect);
    expect(startMutate).toHaveBeenCalledTimes(1);
  });

  it('offers Sync now and Disconnect when healthily connected', async () => {
    mockState(connected());
    render(<StravaConnectPanel />);
    expect(screen.getByText(/Last sync/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Strava' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(syncMutate).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(requestDisconnect).toHaveBeenCalledTimes(1);
  });

  it('offers Reconnect and withholds Sync on auth_failed', () => {
    mockState(connected({ last_run_status: 'auth_failed' }));
    render(<StravaConnectPanel />);
    expect(screen.getByText(/revoked/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reconnect' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Disconnect' })
    ).toBeInTheDocument();
  });

  it('lists the offending activity ids on the ambiguous state', () => {
    mockState(connected({ ambiguous_activity_ids: [9001, 9002] }));
    render(<StravaConnectPanel />);
    expect(
      screen.getByText(/2 activities matched more than one existing session/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/9001, 9002/)).toBeInTheDocument();
  });

  it('shows the backfill progress line while importing history', () => {
    mockState(
      connected({
        backfill_complete: false,
        imported_total: 30,
        adopted_total: 4,
      })
    );
    render(<StravaConnectPanel />);
    expect(screen.getByText(/Importing history/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sync now' })
    ).toBeInTheDocument();
  });

  it('disables syncing while the rate limit is in force', () => {
    mockState(
      connected({
        last_run_status: 'rate_limited',
        rate_limit_resets_at: new Date(Date.now() + 600_000).toISOString(),
      })
    );
    render(<StravaConnectPanel />);
    expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
  });

  it('renders the mapped error label on a partial run', () => {
    mockState(
      connected({
        last_run_status: 'partial',
        failed_total: 2,
        last_error_code: 'insufficient_scope',
      })
    );
    render(<StravaConnectPanel />);
    expect(screen.getByText(/5 imported, 2 failed/)).toBeInTheDocument();
    expect(screen.getByText(/activity read permission/i)).toBeInTheDocument();
  });

  it('shows a loading line before the status resolves', () => {
    connectionMock.mockReturnValue({
      connection: null,
      status: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });
    render(<StravaConnectPanel />);
    expect(screen.getByText(/Checking Strava connection/i)).toBeInTheDocument();
  });

  it('renders a read failure as an error with a retry, never as "not connected"', async () => {
    const refetch = vi.fn();
    connectionMock.mockReturnValue({
      connection: null,
      status: null,
      isLoading: false,
      isError: true,
      refetch,
    });
    render(<StravaConnectPanel />);
    expect(
      screen.getByText(/Could not read the Strava connection status/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Strava not connected/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Connect Strava' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('threads onSynced into the sync mutation', () => {
    const onSynced = vi.fn();
    mockState(connected());
    render(<StravaConnectPanel onSynced={onSynced} />);
    expect(syncFactory).toHaveBeenCalledWith({ onSynced });
  });

  it('renders in compact mode without changing the actions offered', () => {
    mockState(connected());
    render(<StravaConnectPanel compact />);
    expect(
      screen.getByRole('button', { name: 'Sync now' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Disconnect' })
    ).toBeInTheDocument();
  });
});
