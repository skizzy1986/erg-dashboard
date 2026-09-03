import React from 'react';
import { useStravaConnection } from '../hooks/useStravaConnection.js';
import { useStravaConnect } from '../hooks/useStravaConnect.js';
import { useStravaSync } from '../hooks/useStravaSync.js';
import { THEME } from '../constants/theme.js';
import { FONT } from '../constants/type.js';
import { RADIUS, SPACE, TYPE } from '../constants/tokens.js';

// `tone` arrives from describeConnection as a THEME KEY NAME, never a colour.
// This is the only place it becomes a value, so the panel follows the palette
// through the dark→light flip without stravaStatus.js knowing a theme exists.
function toneColor(tone) {
  return THEME[tone] ?? THEME.muted;
}

function Button({ label, onClick, disabled, primary, tone }) {
  const accent = toneColor(tone ?? 'accent');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary && !disabled ? accent : 'transparent',
        border: `1px solid ${disabled ? THEME.border : accent}`,
        color:
          primary && !disabled ? THEME.bg : disabled ? THEME.muted : accent,
        borderRadius: RADIUS.sm,
        padding: `${SPACE.sm}px ${SPACE.md}px`,
        fontSize: TYPE.label.size,
        fontWeight: TYPE.label.weight,
        letterSpacing: TYPE.label.letterSpacing,
        fontFamily: FONT.sans,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

export default function StravaConnectPanel({ compact = false, onSynced }) {
  const { status, connection, isLoading, isError, refetch } =
    useStravaConnection();
  const { start, requestDisconnect, disconnect } = useStravaConnect();
  const sync = useStravaSync({ onSynced });

  const heading = (
    <div
      style={{
        fontSize: TYPE.micro.size,
        fontWeight: TYPE.micro.weight,
        letterSpacing: TYPE.micro.letterSpacing,
        color: THEME.muted,
        fontFamily: FONT.sans,
      }}
    >
      STRAVA
    </div>
  );

  const shell = (children) => (
    <section
      aria-label="Strava connection"
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: RADIUS.md,
        padding: compact ? `${SPACE.md}px` : `${SPACE.lg}px`,
        margin: compact ? `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xxl}px` : 0,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
        fontFamily: FONT.sans,
      }}
    >
      {heading}
      {children}
    </section>
  );

  if (isLoading) {
    return shell(
      <div style={{ fontSize: TYPE.bodySm.size, color: THEME.muted }}>
        Checking Strava connection…
      </div>
    );
  }

  // A failed read is its own state. Rendering "not connected" here would invite
  // a pointless second OAuth round-trip for what is actually a broken query.
  if (isError || !status) {
    return shell(
      <>
        <div
          style={{
            fontSize: TYPE.body.size,
            fontWeight: TYPE.body.weight,
            color: THEME.critical,
          }}
        >
          Could not read the Strava connection status
        </div>
        <div style={{ fontSize: TYPE.bodySm.size, color: THEME.muted }}>
          The connection itself may be fine — only this status read failed.
        </div>
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <Button label="Retry" onClick={() => refetch()} tone="critical" />
        </div>
      </>
    );
  }

  const { kind, headline, detail, tone, canSync, canConnect } = status;
  const connectLabel = kind === 'auth_failed' ? 'Reconnect' : 'Connect Strava';

  return shell(
    <>
      <div
        style={{
          fontSize: TYPE.body.size,
          fontWeight: TYPE.body.weight,
          lineHeight: TYPE.body.lineHeight,
          color: toneColor(tone),
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontSize: TYPE.bodySm.size,
          lineHeight: TYPE.bodySm.lineHeight,
          color: THEME.textSubtle,
        }}
      >
        {detail}
      </div>

      {kind === 'ambiguous' && (
        <div
          style={{
            fontSize: TYPE.caption.size,
            color: THEME.muted,
            fontFamily: FONT.mono,
            wordBreak: 'break-all',
          }}
        >
          Activity ids: {(connection?.ambiguous_activity_ids ?? []).join(', ')}
        </div>
      )}

      {sync.isError && (
        <div style={{ fontSize: TYPE.caption.size, color: THEME.critical }}>
          Sync failed. Try again.
        </div>
      )}
      {start.isError && (
        <div style={{ fontSize: TYPE.caption.size, color: THEME.critical }}>
          Could not start the Strava connection. Try again.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACE.sm,
          marginTop: SPACE.xs,
        }}
      >
        {canConnect && (
          <Button
            label={start.isPending ? 'Opening Strava…' : connectLabel}
            onClick={() => start.mutate()}
            disabled={start.isPending}
            primary
          />
        )}
        {canSync && (
          <Button
            label={sync.isPending ? 'Syncing…' : 'Sync now'}
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            primary={!canConnect}
          />
        )}
        {kind !== 'not_connected' && (
          <Button
            label={disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            onClick={requestDisconnect}
            disabled={disconnect.isPending}
            tone="muted"
          />
        )}
      </div>
    </>
  );
}
