import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StravaConnectCard from '../StravaConnectCard.jsx';

describe('StravaConnectCard', () => {
  it('renders a Connect link with the authorize href when disconnected', () => {
    const url = 'https://www.strava.com/oauth/authorize?client_id=1';
    const { getByText } = render(
      <StravaConnectCard
        connected={false}
        status={null}
        onSyncNow={() => {}}
        syncing={false}
        syncResult={null}
        authorizeUrl={url}
      />
    );
    const link = getByText(/connect strava/i);
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe(url);
  });

  it('renders status and a Sync now button when connected', () => {
    const { getByText } = render(
      <StravaConnectCard
        connected={true}
        status={{
          athleteId: 42,
          expiresAt: '2026-07-01T00:00:00Z',
          scope: 'activity:read_all',
        }}
        onSyncNow={() => {}}
        syncing={false}
        syncResult={null}
        authorizeUrl="x"
      />
    );
    expect(getByText(/athlete 42/i)).toBeTruthy();
    expect(getByText(/sync now/i)).toBeTruthy();
  });

  it('calls onSyncNow when Sync now is clicked', () => {
    const onSyncNow = vi.fn();
    const { getByText } = render(
      <StravaConnectCard
        connected={true}
        status={{ athleteId: 42, expiresAt: null, scope: null }}
        onSyncNow={onSyncNow}
        syncing={false}
        syncResult={null}
        authorizeUrl="x"
      />
    );
    fireEvent.click(getByText(/sync now/i));
    expect(onSyncNow).toHaveBeenCalledTimes(1);
  });

  it('disables the button while syncing', () => {
    const { getByText } = render(
      <StravaConnectCard
        connected={true}
        status={{ athleteId: 42, expiresAt: null, scope: null }}
        onSyncNow={() => {}}
        syncing={true}
        syncResult={null}
        authorizeUrl="x"
      />
    );
    expect(getByText(/syncing/i).disabled).toBe(true);
  });

  it('shows the sync result summary when present', () => {
    const { getByText } = render(
      <StravaConnectCard
        connected={true}
        status={{ athleteId: 42, expiresAt: null, scope: null }}
        onSyncNow={() => {}}
        syncing={false}
        syncResult={{ ok: true, imported: 3, skipped: 2, throttled: false }}
        authorizeUrl="x"
      />
    );
    expect(getByText(/3 imported · 2 skipped/i)).toBeTruthy();
  });

  it('shows a throttled message when throttled', () => {
    const { getByText } = render(
      <StravaConnectCard
        connected={true}
        status={{ athleteId: 42, expiresAt: null, scope: null }}
        onSyncNow={() => {}}
        syncing={false}
        syncResult={{ ok: false, imported: 5, skipped: 0, throttled: true }}
        authorizeUrl="x"
      />
    );
    expect(getByText(/paused on rate limit/i)).toBeTruthy();
  });
});
