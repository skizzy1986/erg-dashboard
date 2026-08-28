import { describe, it, expect, vi } from 'vitest';
import {
  readStravaCallback,
  stravaCallbackMessage,
  clearStravaCallbackFromUrl,
  CALLBACK_REASON_LABELS,
} from '../stravaCallback.js';

describe('readStravaCallback', () => {
  it('reads the params from the hash tail (the app routes on the hash)', () => {
    expect(
      readStravaCallback({ search: '', hash: '#/settings?strava=connected' })
    ).toEqual({ status: 'connected', reason: null });
  });

  it('reads the params from location.search', () => {
    expect(
      readStravaCallback({
        search: '?strava=error&reason=refresh_failed',
        hash: '',
      })
    ).toEqual({ status: 'error', reason: 'refresh_failed' });
  });

  it('reads an error reason out of the hash', () => {
    expect(
      readStravaCallback({
        search: '',
        hash: '#/settings?strava=error&reason=insufficient_scope',
      })
    ).toEqual({ status: 'error', reason: 'insufficient_scope' });
  });

  it('returns null when there is no strava param', () => {
    expect(readStravaCallback({ search: '', hash: '#/overview' })).toBe(null);
    expect(readStravaCallback({ search: '?tab=log', hash: '' })).toBe(null);
  });

  it('returns null for an unrecognised strava value', () => {
    expect(readStravaCallback({ search: '?strava=maybe', hash: '' })).toBe(
      null
    );
  });

  it('returns null for no location at all', () => {
    expect(readStravaCallback(null)).toBe(null);
  });
});

describe('stravaCallbackMessage', () => {
  it('confirms a successful connection', () => {
    const m = stravaCallbackMessage({ status: 'connected', reason: null });
    expect(m.tone).toBe('positive');
    expect(m.text).toMatch(/connected/i);
  });

  // The vocabulary strava-oauth-callback actually emits from its fail() calls.
  // These are NOT last_error_code values; mapping them through that enum sent
  // every one of them to the generic "last sync failed" fallback.
  const EMITTED_REASONS = [
    'denied',
    'state',
    'code',
    'exchange',
    'insufficient_scope',
    'athlete_mismatch',
    'method',
    'server',
  ];

  it('gives every reason the callback can emit its own message', () => {
    const texts = EMITTED_REASONS.map(
      (reason) => stravaCallbackMessage({ status: 'error', reason }).text
    );
    texts.forEach((t) => {
      expect(t).toBeTruthy();
      expect(t).not.toContain(CALLBACK_REASON_LABELS.unknown);
    });
    expect(new Set(texts).size).toBe(EMITTED_REASONS.length);
  });

  it('treats a declined consent as a cancellation, not a failure', () => {
    const m = stravaCallbackMessage({ status: 'error', reason: 'denied' });
    expect(m.tone).toBe('muted');
    expect(m.text).toMatch(/cancelled/i);
    expect(m.text).not.toMatch(/failed|could not/i);
  });

  it('names the conflicting-account case rather than blaming the user', () => {
    const m = stravaCallbackMessage({
      status: 'error',
      reason: 'athlete_mismatch',
    });
    expect(m.tone).toBe('critical');
    expect(m.text).toMatch(/different Strava account/i);
  });

  it('falls back to the generic label for an unrecognised reason', () => {
    const m = stravaCallbackMessage({ status: 'error', reason: 'nonsense' });
    expect(m.text).toContain(CALLBACK_REASON_LABELS.unknown);
    expect(m.text).not.toContain('nonsense');
  });

  it('handles an error with no reason', () => {
    expect(
      stravaCallbackMessage({ status: 'error', reason: null }).text
    ).toContain(CALLBACK_REASON_LABELS.unknown);
  });

  it('returns null for no callback', () => {
    expect(stravaCallbackMessage(null)).toBe(null);
  });
});

describe('clearStravaCallbackFromUrl', () => {
  const makeWin = (location) => ({
    location,
    history: { replaceState: vi.fn() },
  });

  it('strips the params from the hash so a refresh does not replay them', () => {
    const win = makeWin({
      pathname: '/',
      search: '',
      hash: '#/settings?strava=connected',
    });
    clearStravaCallbackFromUrl(win);
    expect(win.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/#/settings'
    );
  });

  it('strips the params from the search and keeps unrelated ones', () => {
    const win = makeWin({
      pathname: '/app',
      search: '?strava=error&reason=unknown&keep=1',
      hash: '#/settings',
    });
    clearStravaCallbackFromUrl(win);
    expect(win.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/app?keep=1#/settings'
    );
  });

  it('keeps unrelated hash params', () => {
    const win = makeWin({
      pathname: '/',
      search: '',
      hash: '#/settings?strava=connected&pane=load',
    });
    clearStravaCallbackFromUrl(win);
    expect(win.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/#/settings?pane=load'
    );
  });

  it('is a no-op without a usable history API', () => {
    expect(() => clearStravaCallbackFromUrl({})).not.toThrow();
    expect(() => clearStravaCallbackFromUrl(null)).not.toThrow();
  });
});
