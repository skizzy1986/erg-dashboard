import { describe, it, expect, vi } from 'vitest';
import {
  readStravaCallback,
  stravaCallbackMessage,
  clearStravaCallbackFromUrl,
} from '../stravaCallback.js';
import { ERROR_CODE_LABELS } from '../stravaStatus.js';

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

  it('maps the error reason through the bounded enum', () => {
    const m = stravaCallbackMessage({
      status: 'error',
      reason: 'db_write_failed',
    });
    expect(m.tone).toBe('critical');
    expect(m.text).toContain(ERROR_CODE_LABELS.db_write_failed);
  });

  it('falls back to the generic label for an unrecognised reason', () => {
    const m = stravaCallbackMessage({ status: 'error', reason: 'nonsense' });
    expect(m.text).toContain(ERROR_CODE_LABELS.unknown);
    expect(m.text).not.toContain('nonsense');
  });

  it('handles an error with no reason', () => {
    expect(
      stravaCallbackMessage({ status: 'error', reason: null }).text
    ).toContain(ERROR_CODE_LABELS.unknown);
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
