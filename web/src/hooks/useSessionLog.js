import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { normType } from '../utils/formatting.js';
import {
  isCompletedStatus,
  isCancelledStatus,
} from '../utils/sessionStatus.js';

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
      // date_iso, not created_at: created_at is INSERTION order, which is only
      // training order by coincidence. A bulk-imported or late-edited session
      // sorted as "most recent" regardless of when it was actually done — the
      // latest-erg tile named a 7/14 session while 8/6, 8/4, 8/2 and 7/30 all
      // existed (#232-D). Matches useErgSessions.js:55-56, including why
      // nullsFirst is mandatory: postgrest-js omits the clause entirely when it
      // is undefined and Postgres defaults descending to NULLS FIRST, which
      // would float an unparseable date to the top as "most recent".
      // id breaks ties — the PM5 save path suffixes labels with hh:mm, so two
      // sessions can share a date.
      .order('date_iso', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
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
              // status drives planned-vs-actual reconciliation. Never null:
              // sessions.status is NOT NULL with a CHECK allow-list as of
              // migration 010, so there is nothing left to coalesce.
              status: r.status,
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
  // The merged list every display + helper uses. DB sessions come back in
  // training-date order (newest first); the hardcoded seed follows.
  const allSessions = [...dbSessions, ...sessionLog];

  // ── FOUR-WAY SPLIT: counted / shown / cancelled / planned ─────
  // One list, two questions. `loggedSessions` is the COUNTED set — training
  // that actually happened — and drives reconciliation, recent sessions and
  // analytics. `logDisplaySessions` is the SHOWN set — everything with a
  // record, cancelled included — because a cancelled session is a decision
  // worth seeing in the Log, just not one worth counting. Planned rows are
  // forward-looking prescriptions and appear in neither.
  // `cancelledSessions` is a strict subset of `logDisplaySessions` and disjoint
  // from `loggedSessions`, carried separately so a view can render a deviation
  // without re-inspecting `status` itself.
  // loggedKeys derives from the COUNTED set: a cancelled session must never
  // reconcile a planned prescription as done.
  // All lists are built in one pass so the date_iso-desc order established by
  // the query above survives — the display object does not carry date_iso, so a
  // split-and-remerge could not reproduce it.
  const loggedSessions = [];
  const logDisplaySessions = [];
  const cancelledSessions = [];
  const plannedSessions = [];
  for (const e of allSessions) {
    if (e.status === 'planned') {
      plannedSessions.push(e);
      continue;
    }
    logDisplaySessions.push(e);
    if (isCompletedStatus(e.status)) loggedSessions.push(e);
    if (isCancelledStatus(e.status)) cancelledSessions.push(e);
  }
  // A planned row is reconciled ("done") once an actual exists for the same
  // date + type. v1 matches on normalized type + date (a planned_id link can
  // come later). Keyed off loggedSessions only.
  const loggedKeys = new Set(loggedSessions.map((e) => `${e.date}|${e.type}`));

  return {
    dbStatus,
    allSessions,
    loggedSessions,
    cancelledSessions,
    logDisplaySessions,
    plannedSessions,
    loggedKeys,
    fetchSessions,
  };
}
