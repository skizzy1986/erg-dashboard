import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
    minimizeApp: (...a) => mockMinimize(...a),
  },
}));
const mockMinimize = vi.fn();

// The destinations render real views with real hooks; this suite is about the
// shell, so each is stubbed down to a marker.
vi.mock('../MobileAnalytics.jsx', () => ({ default: () => <p>TODAY</p> }));
vi.mock('../MobileProgress.jsx', () => ({ default: () => <p>PROGRESS</p> }));
vi.mock('../MobileRecovery.jsx', () => ({ default: () => <p>BODY</p> }));
vi.mock('../../CoachView.jsx', () => ({ default: () => <p>COACH</p> }));
vi.mock('../../ErgLiveView.jsx', () => ({ default: () => <p>ERG LIVE</p> }));
vi.mock('../../../StrengthLogger.jsx', () => ({
  default: () => <p>STRENGTH LOGGER</p>,
}));

import MobileApp from '../MobileApp.jsx';

const back = () => act(() => backHandlers.at(-1)?.());
const tab = (name) => screen.getByRole('button', { name: new RegExp(name) });

beforeEach(() => {
  window.location.hash = '';
  backHandlers.length = 0;
  mockMinimize.mockReset();
});
afterEach(() => {
  window.location.hash = '';
});

describe('MobileApp — the five destinations', () => {
  it('opens on Today', () => {
    render(<MobileApp />);
    expect(screen.getByText('TODAY')).toBeInTheDocument();
  });

  it('shows a tab for each destination and switches between them', async () => {
    const user = userEvent.setup();
    render(<MobileApp />);
    for (const [label, marker] of [
      ['Progress', 'PROGRESS'],
      ['Body', 'BODY'],
      ['Coach', 'COACH'],
    ]) {
      await user.click(tab(label));
      expect(screen.getByText(marker), label).toBeInTheDocument();
    }
  });

  it('deep-links from the hash', () => {
    window.location.hash = '#/coach';
    render(<MobileApp />);
    expect(screen.getByText('COACH')).toBeInTheDocument();
  });
});

describe('a live session owns the screen', () => {
  it('hides the tab bar once a session starts, and restores it on back', async () => {
    const user = userEvent.setup();
    render(<MobileApp />);
    await user.click(tab('Train'));
    expect(screen.getByRole('button', { name: /Erg session/ })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Erg session/ }));
    expect(screen.getByText('ERG LIVE')).toBeInTheDocument();
    // HANDOFF.md §4 — no tab bar while a piece is running.
    expect(screen.queryByRole('button', { name: /Body/ })).toBeNull();

    back();
    expect(await screen.findByRole('button', { name: /Body/ })).toBeVisible();
  });

  it('keeps the session when you step away and come back', async () => {
    const user = userEvent.setup();
    render(<MobileApp />);
    await user.click(tab('Train'));
    await user.click(screen.getByRole('button', { name: /Strength session/ }));
    expect(screen.getByText('STRENGTH LOGGER')).toBeInTheDocument();

    // Checking Body mid-workout must not discard the piece in progress.
    act(() => {
      window.location.hash = '#/body';
      window.dispatchEvent(new window.Event('hashchange'));
    });
    expect(await screen.findByText('BODY')).toBeInTheDocument();

    await user.click(tab('Train'));
    expect(screen.getByText('STRENGTH LOGGER')).toBeInTheDocument();
  });
});

describe('the hardware back button unwinds one level at a time', () => {
  it('returns to Today from another destination', async () => {
    const user = userEvent.setup();
    render(<MobileApp />);
    await user.click(tab('Body'));
    expect(screen.getByText('BODY')).toBeInTheDocument();
    back();
    expect(await screen.findByText('TODAY')).toBeInTheDocument();
    expect(mockMinimize).not.toHaveBeenCalled();
  });

  it('minimises the app only from Today', () => {
    render(<MobileApp />);
    back();
    expect(mockMinimize).toHaveBeenCalledTimes(1);
  });
});
