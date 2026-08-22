import { useState, useEffect, useMemo, Component, lazy, Suspense } from 'react';
import { useSessionLog } from './hooks/useSessionLog.js';
import { useTSSHistory } from './hooks/useTSSHistory.js';
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
import CalendarView from './views/CalendarView.jsx';
import PlanView from './views/PlanView.jsx';
import LogView from './views/LogView.jsx';
import ErgTooltip from './components/ErgTooltip.jsx';
import { calcTrainingLoad } from './utils/trainingLoad.js';
import { C } from './constants/ui.js';

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

  const { loggedSessions, plannedSessions, loggedKeys, fetchSessions } =
    useSessionLog();

  // Live CTL/ATL/TSB. Previously calcTrainingLoad(DAILY_TSS) — a static seed
  // that stopped on 2026-06-13, so every headline load number on desktop was
  // decorative while mobile already read this same hook.
  const { data: tssHistory, isLoading: loadPending } = useTSSHistory();
  // calcTrainingLoad reduces over isoDates[0], so an empty series would walk
  // from an Invalid Date. Guard rather than let it produce a garbage row.
  const loadData = useMemo(
    () => (tssHistory.length ? calcTrainingLoad(tssHistory) : []),
    [tssHistory]
  );
  const latest = loadData[loadData.length - 1] ?? null;
  // Pending is deliberately not unavailable (#196): a slow first read must not
  // flash an outage line and then replace it with real numbers.
  const loadAvailable = latest != null;
  const loadUnavailable = !loadAvailable && !loadPending;
  const tsbColor = !loadAvailable
    ? '#7e7e9a'
    : latest.tsb > 10
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
          {view === 'plan' && (
            <PlanView
              plannedSessions={plannedSessions}
              loggedKeys={loggedKeys}
              isWide={isWide}
            />
          )}

          {/* ── CALENDAR VIEW ── */}
          {view === 'calendar' && (
            <CalendarView loggedSessions={loggedSessions} isWide={isWide} />
          )}

          {/* ── PROGRAM VIEW ── */}
          {view === 'program' && (
            <ProgramView expanded={expanded} setExpanded={setExpanded} />
          )}

          {/* ── OVERVIEW ── */}
          {view === 'overview' && (
            <OverviewView
              latest={latest}
              loadUnavailable={loadUnavailable}
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
            <ErgView
              tsbNow={latest?.tsb ?? null}
              ctlNow={latest?.ctl ?? null}
            />
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
          {view === 'recovery' && <RecoveryView isWide={isWide} />}

          {/* ── LOG VIEW ── */}
          {view === 'log' && (
            <LogView
              loggedSessions={loggedSessions}
              isWide={isWide}
              onSaved={fetchSessions}
            />
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
