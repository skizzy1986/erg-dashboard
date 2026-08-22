import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { normType } from '../utils/formatting.js';
import { isCompletedStatus } from '../utils/sessionStatus.js';

// ── SESSION LOG (add entries here as block progresses) ──────────

const sessionLog = []; // retired — sessions now live in Supabase (migrated)

export function useSessionLog() {
  // ── DATABASE SESSIONS (Supabase) — MERGED with hardcoded history ─
  // Fetch sessions saved to the database on load. These MERGE with the
  // hardcoded `sessionLog` seed: db sessions first (newest), then the
  // baked-in history. The app never loses the seed history even if the
  // DB is empty or unreachable — it just shows the seed alone.
  const [dbSessions, setDbSessions] = useState([]);
  const [dbStatus, setDbStatus] = useState('loading'); // loading | ok | error
  const fetchSessions = () => {
    supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setDbStatus('error');
          return;
        }
        const mapped = (data || [])
          .filter((r) => r.type !== 'Test')
          .map((r) => {
            const raw = (r.type || '').toLowerCase();
            return {
              date: r.date,
              type: normType(r.type, r.label),
              label: r.label,
              duration: r.duration,
              srpe: r.srpe,
              prs: r.prs,
              exercises: r.exercises || undefined,
              coachNote: r.coach_note || undefined,
              // status drives planned-vs-actual reconciliation. null legacy rows
              // are treated as actual (completed history) everywhere downstream.
              status: r.status || null,
              // flat erg metrics (the `splits` field was removed from the schema)
              distance_m: r.distance_m,
              avg_watts: r.avg_watts,
              avg_hr: r.avg_hr,
              // raw-type flags survive normType so the renderer can branch reliably
              _isErg: raw === 'erg',
              _isCycling: raw === 'cycling' || raw === 'bike' || raw === 'ride',
              _fromDb: true,
              _id: r.id,
            };
          });
        setDbSessions(mapped);
        setDbStatus('ok');
      });
  };
  useEffect(() => {
    fetchSessions();
  }, []);
  // The merged list every display + helper uses. DB sessions are newest,
  // so they go first; the hardcoded seed follows.
  const allSessions = [...dbSessions, ...sessionLog];

  // ── THREE-WAY SPLIT: counted / shown / planned ────────────────
  // One list, two questions. `loggedSessions` is the COUNTED set — training
  // that actually happened — and drives reconciliation, recent sessions and
  // analytics. `logDisplaySessions` is the SHOWN set — everything with a
  // record, cancelled included — because a cancelled session is a decision
  // worth seeing in the Log, just not one worth counting. Planned rows are
  // forward-looking prescriptions and appear in neither.
  // loggedKeys derives from the COUNTED set: a cancelled session must never
  // reconcile a planned prescription as done.
  // Both lists are built in one pass so the created_at-desc order established
  // by the query above survives — the display object does not carry created_at,
  // so a split-and-remerge could not reproduce it.
  const loggedSessions = [];
  const logDisplaySessions = [];
  const plannedSessions = [];
  for (const e of allSessions) {
    if (e.status === 'planned') {
      plannedSessions.push(e);
      continue;
    }
    logDisplaySessions.push(e);
    if (isCompletedStatus(e.status)) loggedSessions.push(e);
  }
  // A planned row is reconciled ("done") once an actual exists for the same
  // date + type. v1 matches on normalized type + date (a planned_id link can
  // come later). Keyed off loggedSessions only.
  const loggedKeys = new Set(loggedSessions.map((e) => `${e.date}|${e.type}`));

  return {
    dbStatus,
    allSessions,
    loggedSessions,
    logDisplaySessions,
    plannedSessions,
    loggedKeys,
    fetchSessions,
  };
}
