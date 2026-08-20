import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePM5 } from '../hooks/usePM5';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { supabase } from '../supabaseClient';
import LiveMetric from '../components/LiveMetric';
import WorkoutTarget from '../components/WorkoutTarget';
import { parsePace, formatElapsed } from '../services/pm5Bluetooth';
import { THEME } from '../constants/theme.js';
import { toISODate, toLogDate } from '../utils/dateFormat.js';

const C = {
  bg: THEME.bg,
  panel: THEME.surface,
  border: THEME.border,
  accent: THEME.green,
  cyan: THEME.cyan,
  gold: THEME.gold,
  text: THEME.text,
  muted: THEME.muted,
  err: THEME.red,
};

const SRPE_GUIDE = [
  { v: 1, label: '1 — Very easy' },
  { v: 2, label: '2 — Easy' },
  { v: 3, label: '3 — Light' },
  { v: 4, label: '4 — Moderate' },
  { v: 5, label: '5 — Somewhat hard' },
  { v: 6, label: '6 — Hard' },
  { v: 7, label: '7 — Very hard' },
  { v: 8, label: '8 — Very very hard' },
  { v: 9, label: '9 — Near maximal' },
  { v: 10, label: '10 — Maximal' },
];

// ── SCREEN A: Connect ─────────────────────────────────────────────
function ConnectScreen({
  onConnect,
  connecting,
  error,
  todaySession,
  pending,
}) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 3,
            color: C.muted,
            marginBottom: 8,
          }}
        >
          LIVE ROWING
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: C.accent,
            fontFamily: 'monospace',
          }}
        >
          C2 CONNECT
        </div>
      </div>

      {todaySession && (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <WorkoutTarget session={todaySession} />
        </div>
      )}

      {pending > 0 && (
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: C.gold,
            border: `1px solid ${C.gold}`,
            borderRadius: 6,
            padding: '6px 12px',
          }}
        >
          {pending} PENDING SYNC
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.8,
          maxWidth: 300,
        }}
      >
        Power on your PM5.
        <br />
        Tap Connect — your browser will
        <br />
        ask you to select the device.
      </div>

      {error && (
        <div
          style={{
            background: '#2a0a14',
            border: `1px solid ${C.err}`,
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 12,
            color: C.err,
            maxWidth: 360,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={onConnect}
        disabled={connecting}
        style={{
          padding: '16px 48px',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          background: connecting ? C.border : C.accent,
          color: C.bg,
          border: 'none',
          borderRadius: 10,
          cursor: connecting ? 'default' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {connecting ? 'CONNECTING…' : 'CONNECT TO PM5'}
      </button>

      <div style={{ fontSize: 10, color: '#3a3a5a', letterSpacing: 1 }}>
        Chrome / Edge · Android or Desktop
      </div>
    </div>
  );
}

// ── SCREEN B: Live Rowing ─────────────────────────────────────────
function RowingScreen({ metrics, status, todaySession, onEnd }) {
  const isRowing = status === 'rowing';

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 16px 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isRowing ? C.accent : C.muted,
              boxShadow: isRowing ? `0 0 8px ${C.accent}` : 'none',
            }}
          />
          <span
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: isRowing ? C.accent : C.muted,
            }}
          >
            {isRowing ? 'ROWING' : 'CONNECTED'}
          </span>
        </div>
        <button
          onClick={onEnd}
          style={{
            padding: '6px 14px',
            fontSize: 10,
            letterSpacing: 1,
            background: 'transparent',
            border: `1px solid ${C.err}`,
            borderRadius: 6,
            color: C.err,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          END
        </button>
      </div>

      {/* Primary metric — 500m pace */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        <LiveMetric
          label="500m PACE"
          value={metrics?.paceStr ?? '--:--'}
          unit="/500m"
          accent={C.cyan}
          size="large"
          dimmed={!isRowing}
        />

        {/* Secondary metrics row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            width: '100%',
            maxWidth: 380,
          }}
        >
          <LiveMetric
            label="WATTS"
            value={metrics?.watts}
            unit="W"
            accent={C.gold}
            dimmed={!isRowing}
          />
          <LiveMetric
            label="SPM"
            value={metrics?.strokeRate}
            unit="spm"
            accent={C.accent}
            dimmed={!isRowing}
          />
          <LiveMetric
            label="DIST"
            value={metrics?.distance}
            unit="m"
            accent={C.cyan}
            dimmed={!isRowing}
          />
        </div>

        {/* Elapsed time */}
        <LiveMetric
          label="ELAPSED"
          value={metrics?.elapsedStr ?? '00:00'}
          accent="#a0a0b8"
          size="normal"
          dimmed={!isRowing}
        />
      </div>

      {/* Today's target (collapsible) */}
      {todaySession && (
        <div style={{ marginTop: 16 }}>
          <WorkoutTarget session={todaySession} />
        </div>
      )}
    </div>
  );
}

// ── SCREEN C: Session Summary + Save ─────────────────────────────
function SummaryScreen({ summary, onSave, onDiscard, onDone, saveState }) {
  const [srpe, setSrpe] = useState(5);
  const [notes, setNotes] = useState('');
  const saving = saveState === 'saving';
  const settled = saveState === 'saved' || saveState === 'queued';

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        minHeight: 'calc(100vh - 80px)',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 3, color: C.muted }}>
        SESSION COMPLETE
      </div>

      {/* Totals */}
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 20,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
        }}
      >
        <LiveMetric
          label="DISTANCE"
          value={summary.distance}
          unit="m"
          accent={C.cyan}
          size="normal"
        />
        <LiveMetric
          label="TIME"
          value={summary.elapsedStr}
          accent="#a0a0b8"
          size="normal"
        />
        <LiveMetric
          label="AVG PACE"
          value={summary.avgPace ? parsePace(summary.avgPace) : '--'}
          unit="/500m"
          accent={C.cyan}
          size="normal"
        />
        <LiveMetric
          label="AVG WATT"
          value={summary.avgWatts}
          unit="W"
          accent={C.gold}
          size="normal"
        />
        <LiveMetric
          label="AVG SPM"
          value={summary.avgSpm}
          unit="spm"
          accent={C.accent}
          size="normal"
        />
        <LiveMetric
          label="CALORIES"
          value={summary.calories}
          unit="kcal"
          accent="#7e7e9a"
          size="normal"
        />
      </div>

      {/* sRPE */}
      <div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: C.muted,
            marginBottom: 8,
          }}
        >
          HOW HARD DID IT FEEL? (sRPE)
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {SRPE_GUIDE.map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setSrpe(v)}
              style={{
                padding: '6px 10px',
                fontSize: 11,
                borderRadius: 6,
                cursor: 'pointer',
                border: `1px solid ${srpe === v ? C.accent : C.border}`,
                background: srpe === v ? '#0d2a1a' : 'transparent',
                color: srpe === v ? C.accent : C.muted,
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2,
            color: C.muted,
            marginBottom: 6,
          }}
        >
          NOTES (optional)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it feel? Technique notes…"
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.text,
            fontFamily: 'inherit',
            fontSize: 12,
            padding: '10px 12px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Outcome — the session stays on screen until DONE is pressed, so a
          failed save can never be mistaken for a successful one. */}
      {saveState === 'saved' && (
        <div
          style={{
            fontSize: 12,
            letterSpacing: 2,
            color: C.accent,
            border: `1px solid ${C.accent}`,
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          SAVED TO LOG
        </div>
      )}
      {saveState === 'queued' && (
        <div
          style={{
            fontSize: 12,
            letterSpacing: 2,
            color: C.gold,
            border: `1px solid ${C.gold}`,
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          SAVED LOCALLY — WILL SYNC
        </div>
      )}
      {saveState === 'failed' && (
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1,
            color: C.err,
            border: `1px solid ${C.err}`,
            borderRadius: 8,
            padding: '12px 16px',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          SAVE FAILED — NOT STORED
          <br />
          <span style={{ letterSpacing: 0, fontSize: 11 }}>
            Device storage is full. Free some space, then tap SAVE SESSION
            again.
          </span>
        </div>
      )}

      {/* Actions */}
      {settled ? (
        <button
          onClick={onDone}
          style={{
            padding: '14px',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            background: C.accent,
            color: C.bg,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          DONE
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => onSave({ srpe, notes })}
            disabled={saving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              background: saving ? C.border : C.accent,
              color: C.bg,
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'SAVING…' : 'SAVE SESSION'}
          </button>
          <button
            onClick={onDiscard}
            style={{
              padding: '14px 20px',
              fontSize: 12,
              letterSpacing: 1,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            DISCARD
          </button>
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────
// Postgres unique_violation on sessions' UNIQUE(date, label). The row is
// already in the table, so this is a successful save, not a failure — queueing
// it would guarantee a permanently undrainable entry.
function isDuplicate(dbError) {
  return (
    dbError?.code === '23505' || /duplicate key/i.test(dbError?.message || '')
  );
}

export default function ErgLiveView({ plannedSessions = [], onSessionSaved }) {
  const { status, metrics, summary, error, connect, reset, finish } = usePM5();
  const { addToQueue, pending } = useOfflineQueue();
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState('idle');
  // idle | saving | saved | queued | failed

  // sessions.date is text "M/D/YY", so both sides are normalised to ISO before
  // comparing. `_isErg` is the raw-type flag from useSessionLog — `type` has
  // already been through normType() by then and reads "Z2 Aerobic", never 'erg'.
  const todayISO = toISODate(toLogDate(new Date()));
  const todaySession =
    plannedSessions.find((s) => s._isErg && toISODate(s.date) === todayISO) ||
    null;

  async function saveSession({ srpe, notes }) {
    setSaveState('saving');

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    let user = null;
    let authFailed = false;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      authFailed = true;
    }

    const row = {
      date: toLogDate(now),
      type: 'erg',
      // The time suffix keeps UNIQUE(date, label) satisfied for a second
      // session on the same day. Computed once here so it stays stable if the
      // row goes to the offline queue.
      label: `${todaySession?.label ?? 'Erg Session'} ${hhmm}`,
      duration: formatElapsed(summary.elapsedTime || 0),
      srpe,
      // `||` not `??` — the PM5 reports 0 when a field was never measured.
      distance_m: summary.distance || null,
      avg_watts: summary.avgWatts || null,
      status: 'logged',
      source: 'bluetooth',
      exercises: notes ? [{ name: 'Notes', notes }] : [],
      user_id: user?.id,
    };

    const queue = () => {
      try {
        addToQueue(row);
        setSaveState('queued');
      } catch {
        // localStorage quota exceeded — the row is nowhere. Say so instead of
        // claiming a save.
        setSaveState('failed');
      }
    };

    if (authFailed || !navigator.onLine) {
      queue();
      return;
    }

    let dbError;
    try {
      ({ error: dbError } = await supabase.from('sessions').insert(row));
    } catch (err) {
      dbError = err;
    }

    if (!dbError || isDuplicate(dbError)) {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['erg-sessions'] });
      setSaveState('saved');
    } else {
      queue();
    }
  }

  function done() {
    setSaveState('idle');
    reset();
    if (onSessionSaved) onSessionSaved();
  }

  if (status === 'idle' || status === 'error') {
    return (
      <ConnectScreen
        onConnect={connect}
        connecting={false}
        error={error}
        todaySession={todaySession}
        pending={pending}
      />
    );
  }

  if (status === 'connecting') {
    return (
      <ConnectScreen
        onConnect={() => {}}
        connecting={true}
        error={null}
        todaySession={todaySession}
        pending={pending}
      />
    );
  }

  if (status === 'finished' && summary) {
    return (
      <SummaryScreen
        summary={summary}
        onSave={saveSession}
        onDiscard={reset}
        onDone={done}
        saveState={saveState}
      />
    );
  }

  return (
    <RowingScreen
      metrics={metrics}
      status={status}
      todaySession={todaySession}
      onEnd={finish}
    />
  );
}
