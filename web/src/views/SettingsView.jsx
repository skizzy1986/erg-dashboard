import { useStravaConnection } from '../hooks/useStravaConnection.js';
import { useStravaSync } from '../hooks/useStravaSync.js';
import StravaConnectCard from '../components/StravaConnectCard.jsx';

const C = {
  text: '#e8e8f0',
  muted: '#7e7e9a',
  font: "'DM Mono',monospace",
};

function buildAuthorizeUrl() {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_STRAVA_REDIRECT_URI;
  // OAuth `state`, sent per convention and echoed back by Strava. NOTE: the
  // callback renders server-side HTML and the SPA never receives the redirect,
  // so this value is not compared end-to-end — it is not a working CSRF check.
  // Account binding is enforced server-side via STRAVA_USER_ID in the callback.
  const state = Math.random().toString(36).slice(2);
  try {
    sessionStorage.setItem('strava_oauth_state', state);
  } catch (_) {
    /* sessionStorage unavailable (private mode) — non-fatal */
  }
  const params = new URLSearchParams({
    client_id: clientId ?? '',
    redirect_uri: redirectUri ?? '',
    response_type: 'code',
    scope: 'activity:read_all',
    approval_prompt: 'auto',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export default function SettingsView() {
  const connection = useStravaConnection();
  const sync = useStravaSync();
  const status = connection.data ?? null;

  return (
    <div style={{ fontFamily: C.font }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: 2,
          color: C.muted,
          margin: '4px 0 16px',
        }}
      >
        INTEGRATIONS
      </div>
      <StravaConnectCard
        connected={!!status?.connected}
        status={status}
        onSyncNow={() => sync.mutate()}
        syncing={sync.isPending}
        syncResult={sync.data ?? null}
        authorizeUrl={buildAuthorizeUrl()}
      />
    </div>
  );
}
