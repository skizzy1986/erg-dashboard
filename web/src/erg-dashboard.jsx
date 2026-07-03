import { useState, useEffect, Component, lazy, Suspense } from 'react';
import { supabase } from './supabaseClient.js';
import StrengthLogger from './StrengthLogger.jsx';
import ErgLiveView from './views/ErgLiveView.jsx';
import CoachView from './views/CoachView.jsx';
import ErgView from './views/ErgView.jsx';
import JournalView from './views/JournalView.jsx';
import RecoveryView from './views/RecoveryView.jsx';
import StrengthView from './views/StrengthView.jsx';
import MobilityView from './views/MobilityView.jsx';
import OverviewView from './views/OverviewView.jsx';
import ProgramView from './views/ProgramView.jsx';
import WorkoutItem from './components/WorkoutItem.jsx';
import LogSessionForm from './components/LogSessionForm.jsx';
import LogEntry from './components/LogEntry.jsx';
import ErgTooltip from './components/ErgTooltip.jsx';
import { calcTrainingLoad } from './utils/trainingLoad.js';
import {
  SRPE_GUIDE,
  CALIBRATION_STATUS,
  CRITICAL_POWER,
  POWER_DURATION,
  FTP_TEST,
  DAILY_TSS,
  RHR_BASELINE,
  HRV_BASELINE,
} from './constants/trainingConfig.js';
import {
  MICROCYCLE,
  SEASON,
  EVENT_LADDER,
  PHASE_CONTEXT,
} from './constants/schedule.js';
import { C } from './constants/ui.js';
import { normType } from './utils/formatting.js';
import {
  getRosterMode,
  resolveDay,
  dayStatus,
  daySessions,
} from './utils/schedule.js';

/* ═══════════════════════════════════════════════════════════════
   ERG COACHING DASHBOARD · v1.2 beta
   ───────────────────────────────────────────────────────────────
   MAP (search the ── banner to jump):
   • DATA + HELPERS ......... lines ~4–2015 (everything before App)
       - Logs: SESSION LOG, BLOODS, HORMONE, MOBILITY, DECISION LEDGER
       - Plans: MICROCYCLE, SEASON, EVENT PROGRESSION, MACROFACTOR
       - Engine: ADAPTIVE DECISION ENGINE, AUTOREGULATION, ROSTER
       - Components: WorkoutItem, LogEntry, tooltips
   • APP COMPONENT .......... from `export default function App`
       - State + live clock/roster, NAV, then one block per tab:
         overview · calendar · program · erg · strength · mobility
         · recovery · log · journal
   KEY SYSTEMS:
   • Roster auto-switch: getRosterMode() — home/FIFO by date,
     anchored to ROSTER_ANCHOR (Tue 23 Jun 2026 = FIFO out).
   • Shared workout UI: WorkoutItem (one session/box) + daySessions().
   • Validate before deploy: esbuild + the each-tab render test.
   ═══════════════════════════════════════════════════════════════ */

// ── ERROR BOUNDARY (beta hardening) ───────────────────────────
// Isolates render failures so one bad tab doesn't white-screen the app.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, msg: error?.message || 'Render error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px',
            background: '#1a0d0d',
            border: '1px solid #ff2d5550',
            borderRadius: 6,
            color: '#ffaaaa',
            fontFamily: "'DM Mono',monospace",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          ⚠️ This section hit a render error and was isolated to protect the
          rest of the dashboard.
          <br />
          <span style={{ color: '#888', fontSize: 10 }}>{this.state.msg}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── SESSION LOG (add entries here as block progresses) ──────────

const sessionLog = []; // retired — sessions now live in Supabase (migrated)

const strengthTrend = {
  'Back Squat': [
    { date: '6/3', e1rm: 109.7 },
    { date: '6/5', e1rm: 110.5 },
    { date: '6/9', e1rm: 118.0 },
  ],
  'Romanian Deadlift': [
    { date: '6/3', e1rm: 85.2 },
    { date: '6/5', e1rm: 89.2 },
    { date: '6/9', e1rm: 95.8 },
  ],
  'Bench Press': [
    { date: '6/3', e1rm: 63.4 },
    { date: '6/8', e1rm: 71.2 },
  ],
  'Incline Bench': [
    { date: '6/3', e1rm: 52.9 },
    { date: '6/7', e1rm: 55.8 },
    { date: '6/8', e1rm: 61.7 },
  ],
  'Cable Row': [
    { date: '5/31', e1rm: 62.3 },
    { date: '6/4', e1rm: 74.6 },
    { date: '6/8', e1rm: 98.0 },
  ],
  'Barbell Row': [
    { date: '5/31', e1rm: 53.8 },
    { date: '6/4', e1rm: 62.8 },
  ],
  'Lat Pulldown': [
    { date: '5/31', e1rm: 66.1 },
    { date: '6/4', e1rm: 74.6 },
  ],
  'Shoulder Press': [
    { date: '6/4', e1rm: 41.9 },
    { date: '6/7', e1rm: 46.2 },
  ],
};

// ── PROGRAM STRUCTURE ─────────────────────────────────────────
// Based on: polarized TID (Seiler 2010, Silva Oliveira et al. 2024),
// British Rowing training matrix, Pete Plan continuous improvement model

// ── 2-WEEK MICROCYCLE (roster-driven) ─────────────────────────
// 1-on/1-off FIFO roster used AS periodization. Home week = loading,
// FIFO week = auto-deload. Erg is priority; strength yields when scarce.

// ── STRENGTH GUIDELINES ───────────────────────────────────────
// Concurrent training: heavy/low-rep compounds minimise interference
// effect (Wilson et al. 2012) while maximising force transfer to
// rowing drive & pedal stroke. Pump work isolated to low-cost muscles.

// ── LOG ENTRY COMPONENT ───────────────────────────────────────

// ── SHARED WORKOUT ITEM ───────────────────────────────────────
// ONE component for every workout display (calendar, microcycle,
// today-strip detail). Self-contained expand/collapse with note +
// fuel. Pass the day object (am/pm/note/fuel) + accent color + an

// ── CUSTOM CHART TOOLTIP ──────────────────────────────────────

// ── TRAINING LOAD DATA ────────────────────────────────────────
// TSS per day. Erg: (duration_sec/3600) × (avg_watts/FTP)² × 100
// Strength: time-based estimates (upper ~50, lower ~55, combined ~55)
// FTP estimated at 190W — update after threshold session.

// ── NUTRITION LOG ─────────────────────────────────────────────
// dayType: "two-a-day" | "training" | "rest"
// Targets from bottom-up expenditure model: BMR 1,887 (93.5kg, 187.5cm,
// M40s) + NEAT + TEF + training. Weekly maintenance ~3,140 kcal.
// Calibration phase: eat at maintenance ~2 weeks, then 0.3kg/week deficit.
// Protein 2g/kg = ~187g held constant. Carbs high. Fat moderate floor.

// ── LOG SESSION FORM — writes a strength session to Supabase ───
// Proof-of-concept write path. Strength only for now (erg pulls from
// Strava). On submit: insert into the `sessions` table, then call
// onSaved() so the parent re-fetches and the new entry appears.
// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('overview');
  const [expanded, setExpanded] = useState(null);
  const [ftp, setFtp] = useState(190);
  const [progTab, setProgTab] = useState('phases'); // phases | week | year
  const [nowTick, setNowTick] = useState(new Date()); // for date-awareness (day rollover)
  const [vw, setVw] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  ); // viewport width → responsive layout
  useEffect(() => {
    const t = setInterval(() => setNowTick(new Date()), 60000); // once a minute is plenty
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Responsive breakpoints: wider container on desktop, multi-column where it helps.
  const isWide = vw >= 900; // desktop — use the extra width
  const isMid = vw >= 600; // tablet
  const containerMax = isWide ? 1100 : 680;

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

  // ── PLANNED vs LOGGED SPLIT (reconciliation) ──────────────────
  // Planned rows are forward-looking prescriptions and must NOT appear in the
  // completed Log, the calendar's done-state, recent sessions, or analytics.
  // null-status legacy rows count as actual/completed history.
  const loggedSessions = allSessions.filter((e) => e.status !== 'planned');
  const plannedSessions = allSessions.filter((e) => e.status === 'planned');
  // A planned row is reconciled ("done") once an actual exists for the same
  // date + type. v1 matches on normalized type + date (a planned_id link can
  // come later). Keyed off loggedSessions only.
  const loggedKeys = new Set(loggedSessions.map((e) => `${e.date}|${e.type}`));

  const loadData = calcTrainingLoad(DAILY_TSS);
  const latest = loadData[loadData.length - 1];
  const tsbColor =
    latest.tsb > 10
      ? '#34d399'
      : latest.tsb > -10
        ? '#ffd700'
        : latest.tsb > -30
          ? '#ff6b35'
          : '#ff2d55';

  const ergSessions = loggedSessions.filter((e) => e._isErg);
  const strengthSessions = loggedSessions.filter((e) => e.exercises);
  const latestErg = ergSessions[0]; // dbSessions are newest-first
  const totalErgDist = 55000; // metres, from logged sessions
  const latestSquat = strengthTrend['Back Squat'].slice(-1)[0];
  const totalSessions = loggedSessions.length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08080d',
        color: '#e8e8f0',
        fontFamily: "'DM Mono','Courier New',monospace",
        paddingBottom: 60,
        overflowX: 'hidden',
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: 'linear-gradient(180deg,#1e1e30 0%,#08080d 100%)',
          borderBottom: '1px solid #4a4a68',
          padding: '24px 14px 18px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: containerMax,
            margin: '0 auto',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 3,
                color: '#00d4ff',
                marginBottom: 4,
                minWidth: 0,
              }}
            >
              ERG + STRENGTH · BASE
            </div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: 1,
                color: '#6c6c88',
                flexShrink: 0,
              }}
            >
              v1.2 beta
            </div>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: -1,
            }}
          >
            SPLITIQ
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: containerMax,
          margin: '0 auto',
          padding: isWide ? '0 24px' : '0 14px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* NAV */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            margin: '18px 0 16px',
          }}
        >
          {[
            ['overview', 'Overview'],
            ['calendar', 'Calendar'],
            ['program', 'Program'],
            ['plan', 'Plan'],
            ['live', 'Live'],
            ['erg', 'Erg'],
            ['strength', 'Strength'],
            ['logger', 'Logger'],
            ['mobility', 'Mobility'],
            ['recovery', 'Recovery'],
            ['log', 'Log'],
            ['journal', 'Journal'],
            ['coach', 'Coach'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setExpanded(null);
              }}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                background: view === v ? '#4a4a68' : 'transparent',
                border: view === v ? '1px solid #00d4ff' : '1px solid #4a4a68',
                color: view === v ? '#00d4ff' : '#7e7e9a',
                borderRadius: 6,
                padding: '8px 6px',
                fontSize: 9,
                letterSpacing: 0.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>

        <ErrorBoundary>
          {/* ── STRENGTH LOGGER VIEW (live set/rep logging → sessions) ── */}
          {view === 'logger' && <StrengthLogger />}

          {/* ── LIVE ERG VIEW (Bluetooth PM5 → real-time metrics → session save) ── */}
          {view === 'live' && (
            <ErgLiveView
              plannedSessions={plannedSessions}
              onSessionSaved={() => {
                setView('log');
                fetchSessions();
              }}
            />
          )}

          {/* ── PLAN VIEW (today + future prescriptions from status='planned') ── */}
          {view === 'plan' &&
            (() => {
              // session dates are "M/D/YY" → Date for sorting/today-filtering
              const parsePlanDate = (k) => {
                const [m, d, y] = (k || '').split('/').map(Number);
                return new Date(2000 + (y || 0), (m || 1) - 1, d || 1);
              };
              const now = new Date();
              const today0 = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              const items = plannedSessions
                .map((e) => ({
                  e,
                  dt: parsePlanDate(e.date),
                  done: loggedKeys.has(`${e.date}|${e.type}`),
                }))
                .filter((x) => x.dt >= today0)
                .sort((a, b) => a.dt - b.dt);
              return (
                <>
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderLeft: '3px dashed #00d4ff',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#00d4ff', fontWeight: 700 }}>
                      THE PLAN.{' '}
                    </span>
                    Upcoming prescriptions from Coach (today forward). A dashed
                    border marks a planned session; tap any card for the
                    targets. Cards mark ✓ done once you log the matching
                    session.
                  </div>
                  {items.length === 0 ? (
                    <div
                      style={{
                        background: '#2a2a48',
                        border: '1px solid #4a4a68',
                        borderRadius: 6,
                        padding: '18px 16px',
                        fontSize: 11,
                        color: '#7e7e9a',
                        textAlign: 'center',
                      }}
                    >
                      No upcoming planned sessions.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: isWide ? 'grid' : 'flex',
                        gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
                        flexDirection: 'column',
                        gap: 6,
                        alignItems: isWide ? 'start' : undefined,
                      }}
                    >
                      {items.map(({ e, done }, i) => (
                        <LogEntry
                          key={`plan-${e.date}-${e.label}-${i}`}
                          entry={e}
                          done={done}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

          {/* ── CALENDAR VIEW ── */}
          {view === 'calendar' &&
            (() => {
              const dayNames = [
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
              ];
              const monthNames = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ];
              const now = new Date();
              const today0 = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              // Window: 3 days back (to show recent completed work) → 14 forward.
              // Each day carries its own roster mode + completion status.
              const BACK = 3,
                FWD = 14;
              const days = [];
              let sawSwitch = false,
                firstMode = getRosterMode(today0);
              for (let i = -BACK; i < FWD; i++) {
                const d = new Date(today0);
                d.setDate(today0.getDate() + i);
                const dow = dayNames[d.getDay()];
                const mode = getRosterMode(d);
                if (i >= 0 && mode !== firstMode) sawSwitch = true;
                const sess = resolveDay(d); // override-aware
                const status = dayStatus(d, today0, loggedSessions); // done / today / upcoming / missed
                days.push({
                  date: d,
                  dow,
                  sess,
                  isToday: i === 0,
                  isPast: i < 0,
                  mode,
                  isOverride: !!(sess && sess.override),
                  status,
                });
              }
              const todayMode = firstMode;
              const todayCycle = MICROCYCLE[todayMode] || MICROCYCLE.home;
              return (
                <>
                  <div
                    style={{
                      background: '#2a2a48',
                      border: '1px solid #4a4a68',
                      borderLeft: '3px solid #00d4ff',
                      borderRadius: 6,
                      padding: '11px 14px',
                      marginBottom: 14,
                      fontSize: 11,
                      color: '#aaaacc',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: '#00d4ff', fontWeight: 700 }}>
                      YOUR WEEKS ·{' '}
                    </span>
                    {todayCycle.label.split('—')[0].trim()} ·{' '}
                    {PHASE_CONTEXT.phaseLabel}.{' '}
                    <span style={{ color: '#34d399' }}>✓ done</span> ·{' '}
                    <span style={{ color: '#00d4ff' }}>● today</span> ·
                    upcoming.
                    {sawSwitch ? ' Roster switches mid-view (home↔FIFO).' : ''}
                  </div>
                  <div
                    style={{
                      display: isWide ? 'grid' : 'flex',
                      gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {days.map((d, i) => {
                      const sessions = daySessions(d.sess);
                      const railObj = {
                        top: d.dow.toUpperCase(),
                        big: d.date.getDate(),
                        bottom: monthNames[d.date.getMonth()],
                      };
                      const st = d.status.state;
                      const statusColor =
                        st === 'done'
                          ? '#34d399'
                          : st === 'today'
                            ? '#00d4ff'
                            : st === 'missed'
                              ? '#7e7e9a'
                              : '#6c6c88';
                      const statusLabel =
                        st === 'done'
                          ? `✓ DONE${d.status.logged.length > 1 ? ' ×' + d.status.logged.length : ''}`
                          : st === 'today'
                            ? '● TODAY'
                            : st === 'missed'
                              ? '— not logged'
                              : 'UPCOMING';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            opacity:
                              st === 'missed'
                                ? 0.5
                                : st === 'done' && d.isPast
                                  ? 0.85
                                  : 1,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              paddingLeft: 54,
                              marginBottom: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 7,
                                color: statusColor,
                                letterSpacing: 2,
                                fontWeight: 700,
                              }}
                            >
                              {statusLabel}
                            </span>
                            {d.isOverride && (
                              <span
                                style={{
                                  fontSize: 7,
                                  color: '#ff6b35',
                                  letterSpacing: 2,
                                }}
                              >
                                ⇄ SWAPPED
                              </span>
                            )}
                          </div>
                          {sessions.length === 0 ? (
                            <WorkoutItem
                              session={null}
                              rail={railObj}
                              highlight={d.isToday}
                              showRail={true}
                            />
                          ) : (
                            sessions.map((s, j) => (
                              <WorkoutItem
                                key={j}
                                session={{ ...s, done: st === 'done' }}
                                rail={railObj}
                                highlight={d.isToday && j === 0}
                                showRail={j === 0}
                              />
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Upcoming events from the ladder */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#ffd70010,#1e1e30)',
                      border: '1px solid #ffd70030',
                      borderLeft: '3px solid #ffd700',
                      borderRadius: 6,
                      padding: '12px 14px',
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#ffd700',
                        marginBottom: 8,
                      }}
                    >
                      UPCOMING EVENTS · SEASON 1 LADDER
                    </div>
                    {EVENT_LADDER.slice(0, 5).map((e, i) => {
                      const col =
                        e.kind === 'TARGET'
                          ? '#ff2d55'
                          : e.kind === 'competition'
                            ? '#ff6b35'
                            : e.kind === 'optional'
                              ? '#a78bfa'
                              : '#00d4ff';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginBottom: 6,
                            paddingBottom: 6,
                            borderBottom: i < 4 ? '1px solid #3e3e5a' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: 78,
                              flexShrink: 0,
                              fontSize: 9,
                              fontWeight: 700,
                              color: col,
                            }}
                          >
                            {e.date}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              fontSize: 10,
                              color: '#aaaacc',
                              lineHeight: 1.4,
                            }}
                          >
                            {e.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

          {/* ── PROGRAM VIEW ── */}
          {view === 'program' && (
            <ProgramView expanded={expanded} setExpanded={setExpanded} />
          )}

          {/* ── OVERVIEW ── */}
          {view === 'overview' && (
            <OverviewView
              latest={latest}
              tsbColor={tsbColor}
              loadData={loadData}
              loggedSessions={loggedSessions}
              latestErg={latestErg}
              latestSquat={latestSquat}
              totalErgDist={totalErgDist}
              totalSessions={totalSessions}
              ftp={ftp}
              isWide={isWide}
              nowTick={nowTick}
            />
          )}

          {/* ── ERG VIEW ── */}
          {view === 'erg' && (
            <ErgView tsbNow={latest.tsb} ctlNow={latest.ctl} />
          )}

          {/* ── STRENGTH VIEW ── */}
          {view === 'strength' && (
            <StrengthView
              strengthTrend={strengthTrend}
              strengthSessions={strengthSessions}
            />
          )}

          {/* ── MOBILITY VIEW ── */}
          {view === 'mobility' && <MobilityView />}

          {/* ── RECOVERY VIEW ── */}
          {view === 'recovery' && (
            <RecoveryView latest={latest} isWide={isWide} />
          )}

          {/* ── LOG VIEW ── */}
          {view === 'log' && (
            <>
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderLeft: '3px solid #ffd700',
                  borderRadius: 6,
                  padding: '11px 14px',
                  marginBottom: 14,
                  fontSize: 11,
                  color: '#aaaacc',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: '#ffd700', fontWeight: 700 }}>
                  SESSION LOG:{' '}
                </span>
                Share Concept2 links or Fitbod screenshots to add sessions. sRPE
                captured every session.
              </div>

              {/* Interactive log form — writes to the database */}
              <LogSessionForm onSaved={fetchSessions} />

              {/* sRPE scale reference */}
              <div
                style={{
                  background: '#2a2a48',
                  border: '1px solid #4a4a68',
                  borderLeft: '3px solid #ff6b35',
                  borderRadius: 6,
                  padding: '12px 14px',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    color: '#ff6b35',
                    marginBottom: 8,
                  }}
                >
                  sRPE SCALE · TALK-TEST ANCHORED (asked every session)
                </div>
                {SRPE_GUIDE.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 6,
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 30,
                        fontSize: 12,
                        fontWeight: 700,
                        color: s.color,
                      }}
                    >
                      {s.range}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#e8e8f0',
                          fontWeight: 600,
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{ fontSize: 10, color: '#888', marginLeft: 6 }}
                      >
                        — {s.anchor}
                      </span>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: 8,
                    color: '#7e7e9a',
                    lineHeight: 1.5,
                    marginTop: 6,
                    fontStyle: 'italic',
                  }}
                >
                  Over-rating easy work is the common error — anchor to the talk
                  test. TRIANGULATION: sRPE (felt) + Strava RE (HR-dist) +
                  watts/HR (output) cross-checked every session. All agree =
                  confidence; diverge = early fatigue/stress signal.
                </div>
              </div>
              <div
                style={{
                  display: isWide ? 'grid' : 'flex',
                  gridTemplateColumns: isWide ? '1fr 1fr' : undefined,
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: isWide ? 'start' : undefined,
                }}
              >
                {loggedSessions.map((entry, i) => (
                  <LogEntry
                    key={`${entry.date}-${entry.label}-${i}`}
                    entry={entry}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── JOURNAL VIEW (longitudinal spine) ── */}
          {view === 'journal' && <JournalView />}
          {/* ── COACH VIEW (Claude fitness coach chat) ── */}
          {view === 'coach' && <CoachView />}
        </ErrorBoundary>

        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#1e1e30',
            border: '1px solid #4a4a68',
            borderRadius: 6,
            fontSize: 10,
            color: '#5a5a74',
            textAlign: 'center',
            lineHeight: 1.7,
          }}
        >
          Tap any session to expand · Share Concept2 links or Fitbod screenshots
          to log sessions
        </div>
      </div>
    </div>
  );
}
