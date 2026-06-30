const C = {
  panel: '#1a1a2e',
  panelDark: '#08080d',
  border: '#4a4a68',
  cyan: '#00d4ff',
  text: '#e8e8f0',
  muted: '#7e7e9a',
  err: '#ff2d55',
  ok: '#3ddc84',
  font: "'DM Mono',monospace",
};

function formatExpiry(expiresAt) {
  if (!expiresAt) return '—';
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function ResultLine({ result }) {
  if (!result) return null;
  const colour = result.throttled ? C.err : C.ok;
  const label = result.throttled
    ? `Paused on rate limit · ${result.imported ?? 0} imported`
    : `${result.imported ?? 0} imported · ${result.skipped ?? 0} skipped`;
  return (
    <div
      style={{ marginTop: 10, fontSize: 11, color: colour, fontFamily: C.font }}
    >
      {label}
    </div>
  );
}

export default function StravaConnectCard({
  connected,
  status,
  onSyncNow,
  syncing,
  syncResult,
  authorizeUrl,
}) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '18px 20px',
        maxWidth: 480,
        fontFamily: C.font,
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 2,
          color: C.muted,
          marginBottom: 14,
        }}
      >
        STRAVA
      </div>

      {!connected && (
        <a
          href={authorizeUrl}
          style={{
            display: 'inline-block',
            background: C.cyan,
            color: C.panelDark,
            borderRadius: 6,
            padding: '10px 18px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textDecoration: 'none',
            fontFamily: C.font,
          }}
        >
          CONNECT STRAVA
        </a>
      )}

      {connected && (
        <>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
            Connected · athlete {status?.athleteId ?? '—'} · token valid until{' '}
            {formatExpiry(status?.expiresAt)}
          </div>
          <button
            onClick={onSyncNow}
            disabled={syncing}
            style={{
              marginTop: 14,
              background: syncing ? 'transparent' : '#4a4a68',
              border: `1px solid ${C.cyan}`,
              color: C.cyan,
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 11,
              letterSpacing: 0.5,
              cursor: syncing ? 'default' : 'pointer',
              opacity: syncing ? 0.5 : 1,
              fontFamily: C.font,
            }}
          >
            {syncing ? 'SYNCING…' : 'SYNC NOW'}
          </button>
          <ResultLine result={syncResult} />
        </>
      )}
    </div>
  );
}
