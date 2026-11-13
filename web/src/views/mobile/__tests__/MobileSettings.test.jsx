import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const backHandlers = [];
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (_e, fn) => {
      backHandlers.push(fn);
      return Promise.resolve({ remove: () => {} });
    },
    minimizeApp: () => {},
  },
}));

// Today is stubbed to its one relevant control: the real gear is covered in
// MobileToday.test.jsx, this suite is about what the shell does with it.
vi.mock('../MobileToday.jsx', () => ({
  default: ({ onOpenSettings, focusSettings }) => (
    <div>
      <p>TODAY</p>
      <button
        type="button"
        aria-label="Settings"
        onClick={onOpenSettings}
        ref={(el) => focusSettings && el?.focus()}
      />
    </div>
  ),
}));
vi.mock('../MobileProgress.jsx', () => ({ default: () => <p>PROGRESS</p> }));
vi.mock('../MobileRecovery.jsx', () => ({ default: () => <p>BODY</p> }));
vi.mock('../MobileTrain.jsx', () => ({ default: () => <p>TRAIN</p> }));
// SettingsView itself is real; only the panel's Supabase/Strava hooks are not.
vi.mock('../../../components/StravaConnectPanel.jsx', () => ({
  default: () => <div data-testid="strava-panel" />,
}));

import MobileApp from '../MobileApp.jsx';
import { DESTINATIONS } from '../../../constants/destinations.js';
import { THEME } from '../../../constants/theme.js';

const openSettings = async (user) => {
  render(<MobileApp />);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
};
// Tabs are named by their visible label; "Back to Today" also matches /Today/,
// so tab lookups skip the aria-labelled controls.
const tab = (label) =>
  screen
    .getAllByRole('button', { name: new RegExp(label) })
    .find((b) => !b.hasAttribute('aria-label'));
const tabs = () => DESTINATIONS.map((d) => tab(d.label));

// Resets path, search and hash together: the OAuth tests put the outcome in the
// query string, and a leftover one would route every later test to Settings.
const setUrl = (url) => window.history.replaceState(null, '', url);

beforeEach(() => {
  setUrl('/');
  backHandlers.length = 0;
});
afterEach(() => {
  setUrl('/');
});

describe('mobile Settings', () => {
  it('opens from the gear: heading and Strava panel, Today gone', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' })
    ).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByTestId('strava-panel')).toBeInTheDocument();
    expect(screen.queryByText('TODAY')).toBeNull();
    expect(window.location.hash).toBe('#/settings');
  });

  it('keeps the four-tab bar with no tab active', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const bar = tabs();
    expect(bar).toHaveLength(4);
    for (const t of bar) {
      // The tab bar marks the active tab by colour alone.
      const label = within(t).getByText(/./, { selector: 'span + span' });
      expect(label.style.color, t.textContent).toBe(THEME.textSubtle);
    }
  });

  it('leaves Settings for whichever tab is chosen', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    await user.click(tab('Progress'));
    expect(screen.getByText('PROGRESS')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Settings' })).toBeNull();
  });

  it('the Back control returns to Today', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    await user.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/today');
  });

  it('the hardware back button returns to Today', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    act(() => backHandlers.at(-1)?.());
    expect(await screen.findByText('TODAY')).toBeInTheDocument();
  });

  it('the browser back (a hash change) leaves Settings', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    act(() => {
      window.location.hash = '#/today';
      window.dispatchEvent(new window.Event('hashchange'));
    });
    expect(await screen.findByText('TODAY')).toBeInTheDocument();
  });

  it('the Back control is a 44px target', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    const back = screen.getByRole('button', { name: 'Back to Today' });
    expect(back).toHaveStyle({ width: '44px', height: '44px' });
  });

  it('deep-links from #/settings', () => {
    window.location.hash = '#/settings';
    render(<MobileApp />);
    expect(
      screen.getByRole('heading', { name: 'Settings' })
    ).toBeInTheDocument();
  });
});

describe('the Strava OAuth return on mobile', () => {
  // strava-oauth-callback redirects to the app root with the outcome in the
  // query string (`searchParams.set`), so it arrives as `/?strava=…`, usually
  // with no hash at all.
  it.each([
    ['no hash', '/?strava=connected'],
    ['a stale #/today', '/?strava=connected#/today'],
    ['#/settings', '/?strava=connected#/settings'],
  ])(
    'lands on Settings with the notice from %s, then cleans the URL',
    (_label, url) => {
      setUrl(url);
      render(<MobileApp />);
      expect(
        screen.getByRole('heading', { name: 'Settings' })
      ).toBeInTheDocument();
      expect(screen.queryByText('TODAY')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Strava connected.');
      expect(window.location.search).toBe('');
      expect(window.location.hash).toBe('#/settings');
    }
  );

  it('reports a cancellation in the same place', () => {
    setUrl('/?strava=error&reason=denied');
    render(<MobileApp />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Strava connection cancelled.'
    );
    expect(window.location.search).toBe('');
  });

  it('shows the notice once: Back then the gear does not replay it', async () => {
    const user = userEvent.setup();
    setUrl('/?strava=connected');
    render(<MobileApp />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to Today' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.getByRole('heading', { name: 'Settings' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows no notice on an ordinary visit', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('focus', () => {
  it('moves to the Settings heading when the screen opens', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    expect(screen.getByRole('heading', { name: 'Settings' })).toHaveFocus();
  });

  it('returns to the gear when Back is used', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    await user.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('does not grab the gear when Today is reached by a tab', async () => {
    const user = userEvent.setup();
    await openSettings(user);
    await user.click(tab('Progress'));
    await user.click(tab('Today'));
    expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveFocus();
  });
});

describe('the destinations are unchanged', () => {
  it('still exports exactly four', () => {
    expect(DESTINATIONS.map((d) => d.id)).toEqual([
      'today',
      'train',
      'progress',
      'body',
    ]);
  });
});
