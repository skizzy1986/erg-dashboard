import { describeErrorCode } from './stravaStatus.js';

// The OAuth callback lands on `…#/settings?strava=connected` (or
// `?strava=error&reason=<last_error_code>`). This app has NO router — the tab is
// a useState — so without reading it here the entire OAuth outcome, success and
// failure alike, would land silently on Overview.
//
// Pure so the parsing and the "which message" branches are covered without
// mounting App. App.jsx only calls these three.

const PARAMS = ['strava', 'reason'];

function hashQuery(hash) {
  const i = (hash || '').indexOf('?');
  return new URLSearchParams(i >= 0 ? hash.slice(i + 1) : '');
}

// Reads both `location.search` and the query tail of the hash: the hash is the
// app's own routing surface (Capacitor serves from file://, where pushState
// paths do not resolve), but a web redirect may put the params before it.
export function readStravaCallback(location) {
  if (!location) return null;
  const search = new URLSearchParams(location.search || '');
  const hash = hashQuery(location.hash);
  const status = search.get('strava') ?? hash.get('strava');
  if (status !== 'connected' && status !== 'error') return null;
  return { status, reason: search.get('reason') ?? hash.get('reason') ?? null };
}

export function stravaCallbackMessage(callback) {
  if (!callback) return null;
  if (callback.status === 'connected') {
    return {
      tone: 'positive',
      text: 'Strava connected. Your history is importing now — it continues in the background.',
    };
  }
  // `reason` is the bounded last_error_code enum, never server prose. An
  // unrecognised value maps to the generic label rather than being shown raw.
  return {
    tone: 'critical',
    text: `Strava could not be connected. ${describeErrorCode(callback.reason || 'unknown')}`,
  };
}

// Strip the params so a refresh does not re-trigger the notice.
export function clearStravaCallbackFromUrl(win) {
  if (!win?.location || !win.history?.replaceState) return;
  const { pathname, search, hash } = win.location;

  const nextSearch = new URLSearchParams(search || '');
  PARAMS.forEach((p) => nextSearch.delete(p));

  const i = (hash || '').indexOf('?');
  let nextHash = hash || '';
  if (i >= 0) {
    const params = hashQuery(hash);
    PARAMS.forEach((p) => params.delete(p));
    const rest = params.toString();
    nextHash = `${hash.slice(0, i)}${rest ? `?${rest}` : ''}`;
  }

  const qs = nextSearch.toString();
  win.history.replaceState(
    null,
    '',
    `${pathname}${qs ? `?${qs}` : ''}${nextHash}`
  );
}
