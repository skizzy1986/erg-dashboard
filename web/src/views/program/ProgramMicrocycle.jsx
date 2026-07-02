import WorkoutItem from '../../components/WorkoutItem.jsx';
import { MICROCYCLE } from '../../constants/schedule.js';
import { TECHNOGYM_CONVERSION } from '../../constants/program.js';
import { daySessions } from '../../utils/schedule.js';

export default function ProgramMicrocycle() {
  return (
    <>
      <div
        style={{
          background: '#1e1e30',
          border: '1px solid #4a4a68',
          borderLeft: '3px solid #f472b6',
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 14,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#f472b6', fontWeight: 700 }}>
          ROSTER = PERIODIZATION:{' '}
        </span>
        Your 1-on/1-off FIFO roster is the load/recovery wave. Home week loads,
        FIFO week auto-deloads. Erg is protected; strength yields when scarce.
        This repeats as your base microcycle all year.
      </div>
      {[MICROCYCLE.home, MICROCYCLE.fifo].map((wk) => (
        <div key={wk.label} style={{ marginBottom: 16 }}>
          <div
            style={{
              background: '#2a2a48',
              border: `1px solid ${wk.color}30`,
              borderLeft: `3px solid ${wk.color}`,
              borderRadius: 6,
              padding: '11px 14px',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: wk.color,
              }}
            >
              {wk.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#7e7e9a',
                marginTop: 2,
              }}
            >
              {wk.sub}
            </div>
            {wk.machineNote && (
              <div
                style={{
                  fontSize: 9,
                  color: '#a78bfa',
                  marginTop: 6,
                  lineHeight: 1.5,
                  borderTop: '1px solid #3e3e5a',
                  paddingTop: 6,
                }}
              >
                🚣 {wk.machineNote}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {wk.days.map((d) => {
              const sessions = daySessions(d);
              const railObj = { top: d.day.toUpperCase() };
              return (
                <div
                  key={d.day}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {sessions.length === 0 ? (
                    <WorkoutItem
                      session={null}
                      rail={railObj}
                      showRail={true}
                    />
                  ) : (
                    sessions.map((s, j) => (
                      <WorkoutItem
                        key={j}
                        session={s}
                        rail={railObj}
                        showRail={j === 0}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div
        style={{
          background: '#1e1e30',
          border: '1px solid #ffd70030',
          borderLeft: '3px solid #ffd700',
          borderRadius: 6,
          padding: '11px 14px',
          fontSize: 11,
          color: '#888860',
          lineHeight: 1.6,
        }}
      >
        ⚠️ FIFO week is maintenance, not failure. Missing a session on a
        12-hour-shift day is the correct call. The home week is where you build;
        the work swing is where you recover. Sleep above all during the swing —
        it's already compressed by the roster.
      </div>
      <div
        style={{
          background: '#1e1e30',
          border: '1px solid #a78bfa30',
          borderLeft: '3px solid #a78bfa',
          borderRadius: 6,
          padding: '11px 14px',
          marginTop: 8,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        🔬{' '}
        <span style={{ color: '#a78bfa', fontWeight: 700 }}>
          Technogym ↔ Concept2 conversion (auto-building from Strava):{' '}
        </span>
        {TECHNOGYM_CONVERSION.status}{' '}
        <span style={{ color: '#888860' }}>{TECHNOGYM_CONVERSION.method}</span>{' '}
        Once enough paired HR130 points land, this yields real watt targets for
        the camp machine.{' '}
        <span style={{ color: '#7e7e9a' }}>{TECHNOGYM_CONVERSION.caveats}</span>
      </div>
      <div
        style={{
          background: '#1e1e30',
          border: '1px solid #00d4ff30',
          borderLeft: '3px solid #00d4ff',
          borderRadius: 6,
          padding: '11px 14px',
          marginTop: 8,
          fontSize: 11,
          color: '#aaaacc',
          lineHeight: 1.6,
        }}
      >
        📅{' '}
        <span style={{ color: '#00d4ff', fontWeight: 700 }}>
          Next two cycles — PUSH then RECOVER:{' '}
        </span>
        This home week is a genuine loading week — push volume while fresh (the
        trained cyclist's engine can absorb it). Then FIFO next week is the
        consolidation deload that banks the gains. Push/recover built into the
        roster. Critical: push THIS week, don't fight the FIFO deload next week
        — adaptation happens during recovery. "Push" in base = more volume,
        longer long row, progressed strength, the rate ladder — NOT intensity
        (threshold/VO2 belong in Build 1, Sept+). Governor: family stress is
        real load — if HRV drops or sRPE climbs mid-week, ease off. Data leads.
      </div>
    </>
  );
}
