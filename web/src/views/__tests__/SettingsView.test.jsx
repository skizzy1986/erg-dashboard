import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const connectionMock = vi.fn();
const syncMutate = vi.fn();

vi.mock('../../hooks/useStravaConnection.js', () => ({
  useStravaConnection: () => connectionMock(),
}));

vi.mock('../../hooks/useStravaSync.js', () => ({
  useStravaSync: () => ({ mutate: syncMutate, isPending: false, data: null }),
}));

import SettingsView from '../SettingsView.jsx';

beforeEach(() => {
  connectionMock.mockReset();
  syncMutate.mockReset();
});

describe('SettingsView', () => {
  it('renders the connect link when not connected', () => {
    connectionMock.mockReturnValue({ data: { connected: false } });
    const { getByText } = render(<SettingsView />);
    const link = getByText(/connect strava/i);
    expect(link.getAttribute('href')).toContain('strava.com/oauth/authorize');
    expect(link.getAttribute('href')).toContain('scope=activity%3Aread_all');
  });

  it('renders the connected status when connected', () => {
    connectionMock.mockReturnValue({
      data: {
        connected: true,
        athleteId: 7,
        expiresAt: null,
        scope: 'activity:read_all',
      },
    });
    const { getByText } = render(<SettingsView />);
    expect(getByText(/athlete 7/i)).toBeTruthy();
  });

  it('sends an OAuth state parameter (stored in sessionStorage)', () => {
    connectionMock.mockReturnValue({ data: { connected: false } });
    render(<SettingsView />);
    expect(sessionStorage.getItem('strava_oauth_state')).toBeTruthy();
  });
});
