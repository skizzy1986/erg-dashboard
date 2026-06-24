import React, { useState } from 'react';
import { usePM5 } from '../hooks/usePM5';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { supabase } from '../supabaseClient';
import LiveMetric from '../components/LiveMetric';
import WorkoutTarget from '../components/WorkoutTarget';
import { parsePace } from '../services/pm5Bluetooth';

const C = {
  bg: '#08080d',
  panel: '#1a1a2e',
  border: '#4a4a68',
  accent: '#34d399',
  cyan: '#00d4ff',
  gold: '#ffd700',
  text: '#e8e8f0',
  muted: '#7e7e9a',
  err: '#ff2d55',
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
function ConnectScreen({ onConnect, connecting, error, todaySession }) {
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
function SummaryScreen({ summary, onSave, onDiscard, saving }) {
  const [srpe, setSrpe] = useState(5);
  const [notes, setNotes] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

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

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => onSave({ srpe, notes, date: todayStr })}
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
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────
export default function ErgLiveView({ plannedSessions = [], onSessionSaved }) {
  const { status, metrics, summary, error, connect, reset } = usePM5();
  const { addToQueue } = useOfflineQueue();
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySession =
    plannedSessions.find((s) => s.date === todayStr && s.type === 'erg') ||
    null;

  async function saveSession({ srpe, notes, date }) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const row = {
      date,
      type: 'erg',
      label: todaySession?.label ?? 'Erg Session',
      duration: Math.round((summary.elapsedTime || 0) / 60),
      srpe,
      watts: summary.avgWatts,
      distance: summary.distance,
      status: 'logged',
      source: 'bluetooth',
      exercises: notes ? [{ name: 'Notes', notes }] : [],
      user_id: user?.id,
    };

    if (navigator.onLine) {
      const { error: dbError } = await supabase.from('sessions').insert(row);
      if (dbError) {
        addToQueue(row);
      }
    } else {
      addToQueue(row);
    }

    setSaving(false);
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
      />
    );
  }

  if (status === 'finished' && summary) {
    return (
      <SummaryScreen
        summary={summary}
        onSave={saveSession}
        onDiscard={reset}
        saving={saving}
      />
    );
  }

  return (
    <RowingScreen
      metrics={metrics}
      status={status}
      todaySession={todaySession}
      onEnd={() => {
        // Manual end — build summary from last known metrics
        if (metrics) {
          reset();
        }
      }}
    />
  );
}
