// The OAuth callback lands on `…#/settings?strava=connected` (or
// `?strava=error&reason=<reason>`). This app has NO router — the tab is
// a useState — so without reading it here the entire OAuth outcome, success and
// failure alike, would land silently on Overview.
//
// Pure so the parsing and the "which message" branches are covered without
// mounting App. App.jsx only calls these three.

const PARAMS = ['strava', 'reason'];

// `reason` is the redirect vocabulary emitted by strava-oauth-callback's fail()
// calls, which is NOT the `last_error_code` enum the sync status uses — the two
// sets share only `insufficient_scope`. Mapping these through describeErrorCode
// sent every real reason to the generic "last sync failed" fallback, including
// `denied`, which is the most common outcome of all and is not a failure.
export const CALLBACK_REASON_LABELS = {
  state:
    'The connection link had expired or been used already. Start the connection again.',
  code: 'Strava did not send back an authorisation code. Start the connection again.',
  exchange: 'Strava rejected the connection attempt. Try connecting again.',
  insufficient_scope:
    'The connection was missing permission to read your activities. Connect again and approve activity access.',
  athlete_mismatch:
    'That is a different Strava account from the one already connected. Disconnect the current account first.',
  method:
    'The connection link was opened incorrectly. Start the connection again.',
  server: 'Something went wrong finishing the connection. Try again.',
  unknown: 'The connection did not complete. Try again.',
};

export function describeCallbackReason(reason) {
  return CALLBACK_REASON_LABELS[reason] ?? CALLBACK_REASON_LABELS.unknown;
}

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
  // Declining on Strava's consent screen is a choice, not a fault: say so
  // plainly rather than reporting it as an error against the user.
  if (callback.reason === 'denied') {
    return {
      tone: 'muted',
      text: 'Strava connection cancelled. Nothing was changed — connect whenever you are ready.',
    };
  }
  return {
    tone: 'critical',
    text: `Strava could not be connected. ${describeCallbackReason(callback.reason)}`,
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
